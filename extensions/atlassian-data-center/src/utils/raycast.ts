import { Clipboard, closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";

export async function copyToClipboardWithToast(content: string, shouldCloseMainWindow: boolean = true) {
  const title = "Copied to Clipboard";

  if (shouldCloseMainWindow) {
    closeMainWindow();
  }

  await Clipboard.copy(content);

  if (shouldCloseMainWindow) {
    showHUD(title);
  } else {
    showToast({
      title,
      style: Toast.Style.Success,
    });
  }
}
