import { Clipboard, showToast, Toast } from "@raycast/api";

export const copyToClipboardWithToast = async (text: string, toastMessage = "Copied to clipboard") => {
  if (text) {
    await Clipboard.copy(text);
    await showToast({ style: Toast.Style.Success, title: toastMessage });
  }
};
