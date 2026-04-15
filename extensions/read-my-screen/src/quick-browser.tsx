import { Clipboard, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { analyzeWebPageText } from "./analyze-text";
import { BrowserTabError, getActiveBrowserTab } from "./browser-tab";
import { FetchPageError, fetchPageAsPlainText } from "./fetch-page-text";
import { parseModelPreference } from "./model";
import { formatVisionError } from "./analyze-image";
import { formatUsageHint } from "./token-usage";

export default async function quickBrowserCommand() {
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
    title: "Reading browser tab…",
  });

  try {
    const tab = await getActiveBrowserTab();
    loading.title = "Loading page…";
    const pageText = await fetchPageAsPlainText(tab.url);
    loading.title = "Analyzing…";
    const { text, usage } = await analyzeWebPageText(prefs, parsed, defaultPrompt, tab, pageText);
    await Clipboard.copy(text);
    loading.hide();
    await showToast({
      style: Toast.Style.Success,
      title: "Response ready",
      message: `Copied to clipboard.${formatUsageHint(usage, showTok, usageOpts)}`,
    });
  } catch (err) {
    loading.hide();
    if (err instanceof BrowserTabError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Browser tab",
        message: err.message,
      });
      return;
    }
    if (err instanceof FetchPageError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load page",
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
