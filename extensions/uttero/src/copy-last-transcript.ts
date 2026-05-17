import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { open } from "@raycast/api";

export default async function main() {
  try {
    // Trigger Uttero to copy last transcript to its own clipboard via URL scheme,
    // but we also read the history snapshot directly for speed.
    const { readFileSync } = await import("fs");
    const home = process.env.HOME ?? "";
    const path = `${home}/Library/Application Support/Uttero/history-snapshot.json`;
    const raw = readFileSync(path, "utf-8");
    const snapshot = JSON.parse(raw);
    const first = snapshot?.entries?.[0];

    if (!first?.processedText) {
      await showToast({ style: Toast.Style.Failure, title: "No transcript found", message: "Dictate something first." });
      return;
    }

    await Clipboard.copy(first.processedText);
    await showHUD("Last transcript copied");
  } catch {
    // Fallback: ask Uttero to copy via URL scheme
    try {
      await open("uttero://copy-last");
      await showHUD("Last transcript copied");
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Uttero is not running", message: "Start Uttero first." });
    }
  }
}
