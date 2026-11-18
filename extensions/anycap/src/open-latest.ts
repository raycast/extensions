import { open, showHUD } from "@raycast/api";
import { callTool, deepLink, parseCaptureLines } from "./anycap";

/// The newest capture: its page when it has one, else the item in Anycap.
export default async function main() {
  try {
    const [latest] = parseCaptureLines(await callTool("search", { query: "", limit: 1 }));
    if (!latest) {
      await showHUD("Nothing captured yet");
      return;
    }
    await open(latest.url ?? deepLink(latest.id));
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : String(error));
  }
}
