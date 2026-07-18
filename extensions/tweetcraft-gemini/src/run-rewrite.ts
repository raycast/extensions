import { Clipboard, LaunchProps, showHUD } from "@raycast/api";
import { classifyError, humanizeError, rewriteText } from "./gemini";
import { beginHistoryAttempt, markHistoryError, markHistorySuccess } from "./history";
import { profiles } from "./prompts";
import type { RewriteArguments, RewriteMode } from "./types";

export async function runRewrite(
  props: LaunchProps<{ arguments: RewriteArguments }>,
  mode: RewriteMode,
): Promise<void> {
  const input = props.arguments.text?.trim();
  if (!input) {
    await showHUD("❌ Enter some Chinese text");
    return;
  }

  let historyEntry;
  try {
    // The source text is written locally before any network request begins.
    historyEntry = await beginHistoryAttempt(input, mode);
  } catch (error) {
    console.error("Failed to save local draft", error);
    await Clipboard.copy(input);
    await showHUD("❌ Draft could not be saved. The original was copied; nothing was sent to Gemini");
    return;
  }

  const profile = profiles[mode];
  await showHUD(`✨ Draft saved. Writing the ${profile.label.toLowerCase()} English version…`);

  try {
    const output = await rewriteText(input, mode);
    await markHistorySuccess(historyEntry.id, output);
    await Clipboard.copy(output);
    const count = Array.from(output).length;
    await showHUD(`✅ ${profile.label} English copied (${count} characters)`);
  } catch (error) {
    console.error("Gemini rewrite failed", classifyError(error));
    const message = humanizeError(error);

    try {
      await markHistoryError(historyEntry.id, classifyError(error), message);
    } catch (historyError) {
      console.error("Failed to update local draft error state", historyError);
    }

    await Clipboard.copy(input);
    await showHUD(`❌ Rewrite failed. The original Chinese was copied: ${message}`);
  }
}
