import { AI, Clipboard, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { humanifyPhase1, humanifyFinalize } from "./lib/humanify";

export default async function Command() {
  // Issue #1 fix: use auto-generated Preferences type from raycast-env.d.ts
  const { defaultIntensity } = getPreferenceValues<Preferences.HumanifyClipboard>();

  const clipboardText = await Clipboard.readText();
  if (!clipboardText?.trim()) {
    await showHUD("❌ Clipboard is empty");
    return;
  }

  const text = clipboardText.trim();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Humanifying clipboard...",
    message: `${defaultIntensity} mode`,
  });

  try {
    // Phase 1: rule-based cleanup
    const p1 = humanifyPhase1(text, defaultIntensity);

    // Issue #3 fix: always run LLM — Phase 1 may miss subtle AI patterns

    // Phase 2: Raycast AI rewrite
    const aiResult = await AI.ask(p1.prompt, {
      creativity: p1.creativity,
    });

    // Phase 3: finalize and build diff
    const result = humanifyFinalize(text, aiResult, p1.stats);

    await Clipboard.copy(result.final);

    toast.style = Toast.Style.Success;
    toast.title = "Copied to clipboard!";
    toast.message = `${result.changes.length} changes made`;

    await showHUD(`✅ Humanified! ${result.changes.length} changes`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}
