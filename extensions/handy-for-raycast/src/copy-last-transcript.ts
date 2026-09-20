import { Clipboard, showHUD } from "@raycast/api";
import { compact, showFailure } from "./lib/errors";
import { getLatestEntry, preferredText } from "./lib/history";

export default async function command() {
  try {
    const entry = getLatestEntry();
    if (!entry) return void (await showHUD("No Handy transcripts yet"));
    const text = preferredText(entry);
    await Clipboard.copy(text);
    await showHUD(`Copied “${compact(text)}”`);
  } catch (error) {
    await showFailure("Could not copy the latest transcript", error);
  }
}
