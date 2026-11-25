import { Clipboard, showHUD } from "@raycast/api";
import { showFailureHUD } from "./lib/feedback";
import { hex } from "./lib/hex";
import { HistoryReply } from "./lib/types";

export default async function Command() {
  try {
    const { entries, retention } = await hex<HistoryReply>(["history", "--limit", "500"]);
    if (retention === "off") {
      await showHUD("History is off in Hex, so there's no dictation to copy");
      return;
    }
    const latest = entries.find((entry) => entry.kind !== "printed");
    if (!latest) {
      await showHUD("No dictation to copy");
      return;
    }
    await Clipboard.copy(latest.final_text);
    await showHUD("Copied last dictation");
  } catch (error) {
    await showFailureHUD(error);
  }
}
