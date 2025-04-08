import React, { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { Preferences, getInputText, callGemini } from "./utils"; // utilsから共通関数と型をインポート

export default function Command() {
  // 状態管理用フック
  const [text, setText] = useState<string>(""); // 表示する要約結果テキスト
  const [isLoading, setIsLoading] = useState<boolean>(true); // ローディング状態
  const [error, setError] = useState<string | null>(null); // エラーメッセージ

  // コンポーネントマウント時に要約処理を実行
  useEffect(() => {
    const summarize = async () => {
      // 関数名を summarize に変更 (任意)
      setIsLoading(true); // 開始時にローディング状態にする
      try {
        // PreferencesからAPIキーとモデル名を取得
        const { geminiApiKey, geminiModel } = getPreferenceValues<Preferences>();

        // APIキーとモデル名が設定されているかチェック
        if (!geminiApiKey || !geminiModel) {
          throw new Error("API Key or Model not configured in preferences.");
        }

        // 要約対象のテキストを取得
        const inputText = await getInputText();

        // 処理中であることをユーザーに通知
        await showToast(Toast.Style.Animated, "Summarizing in Japanese..."); // メッセージを要約用に変更

        // Gemini APIに渡すプロンプトを作成 (日本語要約用)
        const prompt = `以下のソフトウェア開発関連テキストの要点を、日本語で簡潔に要約してください。重要な技術的ポイント、決定事項、またはアクションアイテムがわかるようにまとめてください。応答には要約文のみを含め、他の導入、コメント、代替案などは含めないでください:\n\n${inputText}`;

        // 共通化されたGemini API呼び出し関数を使用
        const summarizedText = await callGemini(prompt, geminiApiKey, geminiModel); // 変数名を変更 (任意)

        // 成功したら結果テキストを状態にセット
        setText(summarizedText);
        await showToast(Toast.Style.Success, "Summarization Complete"); // メッセージを要約用に変更
      } catch (err) {
        // エラーハンドリング
        console.error("Summarization Error:", err); // エラーログの識別子を変更 (任意)
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        setError(message); // エラー状態をセット
        await showToast(Toast.Style.Failure, "Error", message); // エラートースト表示
      } finally {
        // 成功・失敗に関わらずローディング状態を解除
        setIsLoading(false);
      }
    };

    summarize(); // 非同期関数を実行
  }, []); // 空の依存配列で、マウント時に一度だけ実行

  // エラーが発生した場合の表示
  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} />;
  }

  // ローディング中または要約結果の表示
  return (
    <Detail
      isLoading={isLoading} // ローディング状態をDetailコンポーネントに渡す
      markdown={text} // 要約結果をマークダウンとして表示
      actions={
        // ローディング中でなく、かつ結果テキストが存在する場合のみアクションを表示
        !isLoading && text ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Summary" content={text} /> {/* titleを要約用に変更 */}
            <Action.Paste title="Paste Summary" content={text} /> {/* titleを要約用に変更 */}
          </ActionPanel>
        ) : null
      }
    />
  );
}
