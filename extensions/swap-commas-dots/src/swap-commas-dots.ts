import { getSelectedText, Clipboard, showToast, Toast } from "@raycast/api";
import { swapCommasAndDots } from "./utils";

export default async () => {
  try {
    const selectedText = await getSelectedText();
    const transformedText = swapCommasAndDots(selectedText);
    await Clipboard.paste(transformedText);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot transform text",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
