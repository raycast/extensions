import { Clipboard, showToast, Toast } from "@raycast/api";
import { saveTranslation } from "./history";
import { getTranslatorConfig, smartTranslate } from "./translator";

export default async function Command() {
  try {
    const clipboardText = await Clipboard.readText();

    if (!clipboardText || clipboardText.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty Clipboard",
        message: "Please copy text to translate first",
      });
      return;
    }

    // Get translator config
    const config = getTranslatorConfig();

    if (!config.apiKey || !config.apiURL) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message: "Please configure API Key and URL in preferences",
      });
      return;
    }

    // Show translating toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Translating...",
      message:
        clipboardText.substring(0, 50) +
        (clipboardText.length > 50 ? "..." : ""),
    });

    const result = await smartTranslate(clipboardText.trim(), config);
    await saveTranslation(
      result.originalText,
      result.translatedText,
      result.detectedLanguage,
      result.targetLanguage,
    );
    await Clipboard.copy(result.translatedText);

    await showToast({
      style: Toast.Style.Success,
      title: "Translated ✓",
      message: result.translatedText,
    });
  } catch (error) {
    console.error("Quick translate error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Translation Failed",
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
}
