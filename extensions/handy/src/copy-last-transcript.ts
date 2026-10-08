import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { displayText, getLatestEntry } from "./lib/db";

export default async function main() {
  try {
    const entry = getLatestEntry();
    if (!entry) {
      await showHUD("No transcriptions yet");
      return;
    }
    const text = displayText(entry);
    await Clipboard.copy(text);
    const preview = text.length > 40 ? `${text.slice(0, 40)}…` : text;
    await showHUD(`Copied: ${preview}`);
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not read history",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
