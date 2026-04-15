import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { detectAndClean } from "./cleaner";

export default async function main() {
  const { text } = await Clipboard.read();

  if (!text || !text.trim()) {
    await showHUD("❌ Clipboard is empty");
    return;
  }

  const cleaned = detectAndClean(text);

  if (!cleaned) {
    await showHUD("❌ Nothing to clean");
    return;
  }

  await Clipboard.copy(cleaned);
  await showToast({
    style: Toast.Style.Success,
    title: "Clode Cleaned!",
    message: "Cleaned text copied to clipboard",
  });
}
