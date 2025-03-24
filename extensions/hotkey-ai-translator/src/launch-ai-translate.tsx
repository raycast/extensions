import { getSelectedText, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { EmptyTextError } from "@/utils/errors";

/**
 * 選択中のテキストを取得してAI翻訳コマンドを起動するコマンド（ここがエントリポイント）
 */
export default async function Command() {
  try {
    // 前後空白は削除する
    const selectedText = (await getSelectedText()).trim();

    if (!selectedText) {
      throw new EmptyTextError();
    }

    await launchCommand({
      name: "ai-translate",
      type: LaunchType.UserInitiated,
      context: {
        inputText: selectedText,
      },
    });
  } catch (error: unknown) {
    /**
     * @raycast/api の getSelectedText() の実行に失敗した場合のハンドリング
     *
     * エラーメッセージでハンドリングしているのが少しカッコ悪いが致し方なし
     */
    if (error instanceof Error && error.message === "Unable to get selected text from frontmost application") {
      console.error("[🚨ERROR] launch-ai-translate.tsx__error(RaycastAPIError): ", error);
      showFailureToast(error, {
        title: "Failed to retrieve the text. Please try again.",
      });
      return;
    }

    if (error instanceof EmptyTextError) {
      console.error("[🚨ERROR] launch-ai-translate.tsx__error(EmptyTextError): ", error);
      showFailureToast(error, {
        title: "No text selected. Please select a text to translate.",
      });
      return;
    }

    console.error("[🚨ERROR] launch-ai-translate.tsx__error(Error): ", error);
    showFailureToast(error, {
      title: "AI Translate failed to start. Please try again.",
    });
  }
}
