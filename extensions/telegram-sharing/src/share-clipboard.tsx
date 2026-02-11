import { Clipboard, open, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    const clipboardText = await Clipboard.readText();
    if (!clipboardText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
        message: "Copy some text first",
      });
      return;
    }
    await open(`tg://msg_url?url=&text=${encodeURIComponent(clipboardText)}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to share clipboard",
      message: String(error),
    });
  }
}
