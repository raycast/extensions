import { Clipboard, showToast, Toast } from "@raycast/api";

export const copyWithFeedback = async (text: string) => {
  if (text === "") {
    showToast({
      title: "No text to copy",
      style: Toast.Style.Failure,
    });
    return;
  }

  try {
    await Clipboard.copy(text);
    showToast({
      title: "Copied to clipboard",
      style: Toast.Style.Success,
    });
  } catch {
    showToast({
      title: "Failed to copy",
      message: "An error occurred while copying to clipboard.",
      style: Toast.Style.Failure,
    });
  }
};
