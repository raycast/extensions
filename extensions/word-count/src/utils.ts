import { Clipboard, Toast, showToast } from "@raycast/api";

export async function readFromClipboard() {
  const clipboard = await Clipboard.readText();

  if (!clipboard) return "";

  showToast({
    style: Toast.Style.Success,
    title: `Text loaded from clipboard`,
    message: `[⌘ + E] to reset`,
  });

  return clipboard.trim();
}
