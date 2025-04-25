import { Clipboard, showToast, Toast } from "@raycast/api";

export const copyWithFeedback = async (text: string) => {
  if (text === "") {
    showToast({
      title: "No text to copy",
      style: Toast.Style.Failure,
    });
    return;
  }

  await Clipboard.copy(text);
  showToast({
    title: "Copied to clipboard",
    style: Toast.Style.Success,
  });
};
