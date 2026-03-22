import { Clipboard } from "@raycast/api";
import { cleanWithStats, type CleanResult } from "./cleaner";

export type ClipboardCleanResult =
  | { status: "cleaned"; result: CleanResult }
  | { status: "empty" }
  | { status: "unchanged"; text: string };

export async function readAndClean(): Promise<ClipboardCleanResult> {
  const { text } = await Clipboard.read();

  if (!text) {
    return { status: "empty" };
  }

  const result = cleanWithStats(text);

  if (!result.changed) {
    return { status: "unchanged", text };
  }

  return { status: "cleaned", result };
}

// reductionPercent can be 0 even when changed=true (e.g. tiny edits that round to <1%)
export function buildHudText(reductionPercent: number): string {
  const successText = `✓ Bougie!`;

  if (reductionPercent > 0) {
    return `${successText} (${reductionPercent}% rinsed)`;
  }

  return successText;
}
