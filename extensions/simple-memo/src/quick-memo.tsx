import { showToast, Toast } from "@raycast/api";
import { MemoStorage } from "./storage/memo-storage";
import { format } from "date-fns";
import { showFailureToast } from "@raycast/utils";

export default async function Command(props: { arguments: { content: string } }) {
  function generateMemoTitle(content: string): string {
    const dateStr = format(new Date(), "MMM dd, yyyy 'at' h:mm:ss a");

    // 내용의 첫 부분을 미리보기로 사용
    const preview = content.trim().split("\n")[0].slice(0, 20);
    const previewText = preview.length < content.trim().split("\n")[0].length ? `${preview}...` : preview;

    return `${dateStr} - ${previewText || "Quick Memo"}`;
  }

  try {
    const { content } = props.arguments;

    // Validate input
    if (!content?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Input",
        message: "Memo content cannot be empty",
      });
      return;
    }

    const title = generateMemoTitle(content);

    // Save memo
    await MemoStorage.createMemo(title, content);

    // Show success message
    await showToast({
      title: "Memo Saved",
      message: "Your memo has been saved successfully",
    });
  } catch (error) {
    await showFailureToast(error, {
      title: "Error Saving Memo",
    });
  }
}
