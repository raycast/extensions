import { Clipboard, showToast, Toast } from "@raycast/api";

export const copyToClipboardWithToast = async (text: string, toastMessage = "Copied to clipboard") => {
  if (!text) {
    await showToast({ style: Toast.Style.Failure, title: "Nothing to copy" });
    return;
  }

  try {
    await Clipboard.copy(text);
    await showToast({ style: Toast.Style.Success, title: toastMessage });
  } catch (error: unknown) {
    if (error instanceof Error) {
      await showToast({ style: Toast.Style.Failure, title: error.message });
    } else {
      await showToast({ style: Toast.Style.Failure, title: "Failed to copy to clipboard" });
    }
  }
};
