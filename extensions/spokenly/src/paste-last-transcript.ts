import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { getLatestEntry } from "./lib/history";

export default async function main() {
  try {
    const entry = getLatestEntry();
    if (!entry) {
      await showHUD("No transcriptions yet");
      return;
    }
    if (!entry.text) {
      await showHUD("Last entry has no text");
      return;
    }
    await Clipboard.paste(entry.text);
    const preview =
      entry.text.length > 40 ? `${entry.text.slice(0, 40)}…` : entry.text;
    await showHUD(`Pasted: ${preview}`);
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not paste transcript",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
