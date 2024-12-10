import { Clipboard, showToast, Toast } from "@raycast/api";

export async function copyClipboard(path: string): Promise<boolean> {
  const file = path;
  const fileContent: Clipboard.Content = { file };
  try {
    await Clipboard.copy(fileContent);
    return true;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "There was some issue copying to clipboard",
    });
    return false;
  }
}
