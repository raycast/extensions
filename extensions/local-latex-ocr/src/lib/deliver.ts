import { Clipboard } from "@raycast/api";
import { formatLatex } from "./output";
import type { ExtensionPreferences, OutputMode } from "../types";

export async function deliverLatex(
  latex: string,
  mode: OutputMode,
  preferences: Pick<ExtensionPreferences, "copyToClipboard" | "pasteAutomatically">,
): Promise<string> {
  const output = formatLatex(latex, mode);
  await deliverOutput(output, preferences);
  return output;
}

/** Copy the formatted result without pasting it into the frontmost app. */
export async function copyLatex(latex: string, mode: OutputMode): Promise<string> {
  const output = formatLatex(latex, mode);
  await Clipboard.copy(output);
  return output;
}

/** Paste an already-formatted result without changing clipboard preferences. */
export async function pasteLatex(output: string): Promise<void> {
  await Clipboard.paste(output);
}

async function deliverOutput(
  output: string,
  preferences: Pick<ExtensionPreferences, "copyToClipboard" | "pasteAutomatically">,
): Promise<void> {
  if (preferences.copyToClipboard) await Clipboard.copy(output);
  if (preferences.pasteAutomatically) await Clipboard.paste(output);
}
