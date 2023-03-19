// モジュール 'vscode' には、VS Code の拡張性 API が含まれています。
// モジュールをインポートし、以下のコードでエイリアスの vscode を使用して参照します。
import * as vscode from 'vscode';
import { ChatGPT, ChatGPTError, prompt } from "ts-chatgpt";

// このメソッドは、拡張機能が有効化されたときに呼び出されます。
// コマンドが最初に実行されたときに、拡張機能が有効になります。
export function activate(context: vscode.ExtensionContext) {

	// コンソールを使って、診断情報（console.log）やエラー（console.error）を出力する。
	// このコード行は、拡張機能が有効化されたときに一度だけ実行されます。
	console.log('Congratulations, your extension "chatgpt" is now active!');

	// コマンドはpackage.jsonファイルで定義されています。
	// 次に、registerCommand でコマンドの実装を提供します。
	// commandIdパラメータは、package.jsonのcommandフィールドと一致する必要があります。
	let disposable = vscode.commands.registerCommand('chatgpt.helloWorld', () => {
		// ここに置いたコードは、コマンドが実行されるたびに実行されます。
		// ユーザーへのメッセージボックスを表示する
		vscode.window.showInformationMessage('Hello World from chatgpt!');
	});

	// 設定を取得する
	const config = vscode.workspace.getConfiguration('chatgpt');

	context.subscriptions.push(disposable);
	context.subscriptions.push(vscode.commands.registerCommand('chatgpt.prompt', async () => {

		// APIキーを取得する
		const config = vscode.workspace.getConfiguration('chatgpt');
		const apikey = config.get("apiKey");
		if (!apikey && typeof apikey !== "string") {
			vscode.window.showErrorMessage("APIキーが設定されていません。");
			return;
		}
		vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Inquiring with ChatGPT..." }, async (progress, token) => {
			// 選択範囲を取得する
			const editor = vscode.window.activeTextEditor;
			const selections = editor?.selections.filter(selection => !selection.isEmpty);
			if (!selections || selections.length === 0) {
				return;
			}
			// 選択範囲のテキストを取得する
			const texts = selections.map(selection => editor?.document.getText(selection));

			// ChatGPTに問い合わせる
			const messages = await Promise.all(texts.map(async (text, index) => {
				const response = await prompt({
					model: "gpt-3.5-turbo-0301",
					messages: [
						{
							role: "user",
							content: text ?? "",
						}
					],
					options: {
						apiKey: apikey as string,
						temperature: 0.1,
					}
				});
				if (response && "error" in response) {
					const data = response as ChatGPTError;
					return data.error.message;
				}
				if (response && "choices" in response) {
					const data = response as ChatGPT;
					const choices = data.choices ?? [];
					return choices[0].message.content;
				}
				return "";
			}));

			// フォーカスが存在するエディターの末尾にテキストを挿入する
			const activeEditor = vscode.window.activeTextEditor;
			await activeEditor?.edit((editor: vscode.TextEditorEdit) => {
				for (const index in selections) {
					const selection = selections[index];
					const text = texts[index];
					const message = messages[index];
					if (selection && text) {
						// editor.replace(selection, text + "!");
						editor.insert(selection.end, "\n\n" + message);
					}
				}
			});
		});
	}));

	vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
		const config = vscode.workspace.getConfiguration('chatgpt');
		if (event.affectsConfiguration("chatgpt.apikey")) {

		}
	});
}

// このメソッドは、拡張機能が無効化されたときに呼び出されます。
export function deactivate() { }
