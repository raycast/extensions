import { Clipboard, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { analyzeImage, formatVisionError } from "./analyze-image";
import { ClipboardImageError, readImageFromClipboard } from "./clipboard-image";
import { parseModelPreference } from "./model";
import { formatUsageHint } from "./token-usage";

export default async function quickClipboardCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const showTok = prefs.showTokenUsage === true;
  const defaultPrompt =
    prefs.defaultPrompt?.trim() ||
    "Describe what you see on the screen. Call out any text, UI elements, errors, or notable details.";
  const modelPref = prefs.model?.trim() || "openai:gpt-4o-mini";
  const usageOpts = {
    modelValue: modelPref,
    showEstimatedCost: showTok && prefs.showEstimatedCost === true,
  };
  const parsed = parseModelPreference(modelPref);

  const loading = await showToast({
    style: Toast.Style.Animated,
    title: "Reading clipboard…",
  });

  try {
    const img = await readImageFromClipboard();
    loading.title = "Analyzing…";
    const { text, usage } = await analyzeImage(prefs, parsed, img.base64, defaultPrompt, img.mediaType);
    await Clipboard.copy(text);
    loading.hide();
    await showToast({
      style: Toast.Style.Success,
      title: "Response ready",
      message: `Copied to clipboard.${formatUsageHint(usage, showTok, usageOpts)}`,
    });
  } catch (err) {
    loading.hide();
    if (err instanceof ClipboardImageError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard",
        message: err.message,
      });
      return;
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Analysis failed",
      message: formatVisionError(err),
    });
  }
}
