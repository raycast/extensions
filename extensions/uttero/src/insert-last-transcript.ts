import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { readFileSync } from "fs";

export default async function main() {
  try {
    const home = process.env.HOME ?? "";
    const path = `${home}/Library/Application Support/Uttero/history-snapshot.json`;
    const raw = readFileSync(path, "utf-8");
    const snapshot = JSON.parse(raw);
    const first = snapshot?.entries?.[0];

    if (!first?.processedText) {
      await showToast({ style: Toast.Style.Failure, title: "No transcript found", message: "Dictate something first." });
      return;
    }

    await Clipboard.paste(first.processedText);
    await showHUD("Last transcript inserted");
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to read transcript", message: "Check Uttero is running." });
  }
}
