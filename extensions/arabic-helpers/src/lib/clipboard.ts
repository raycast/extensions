import { Clipboard, showToast, Toast } from "@raycast/api";

export async function readClipboardText(): Promise<string | undefined> {
  const text = await Clipboard.readText();

  if (text === undefined || text.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Clipboard has no text",
      message: "Copy some text and try again.",
    });
    return undefined;
  }

  return text;
}
