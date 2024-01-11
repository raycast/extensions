import { showHUD, Clipboard, Toast, showToast } from "@raycast/api";

export default async function main() {
  try {
    let plainText = await Clipboard.readText();
    if (plainText) {
      await Clipboard.paste(plainText);
      await Clipboard.copy(plainText);
      await showHUD("Paste text successfully");
    } else {
      throw new Error("Clipboard is empty");
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Oh! Unknown error~";
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: msg,
    });
  }
}