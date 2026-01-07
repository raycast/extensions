import {
  Clipboard,
  getSelectedText,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { getTranslatorConfig, smartTranslate } from "./translator";

export default async function Command() {
  try {
    // Get selected text from active editor
    let selectedText: string;
    try {
      selectedText = await getSelectedText();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Selection",
        message: "Please select some text first",
      });
      return;
    }

    if (!selectedText || selectedText.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty Selection",
        message: "Please select some text first",
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
        selectedText.substring(0, 50) + (selectedText.length > 50 ? "..." : ""),
    });

    // Smart translate
    const result = await smartTranslate(selectedText.trim(), config);

    // Paste translated text directly into active editor (replaces selection)
    await Clipboard.paste(result.translatedText);

    // Show result on toast
    await showToast({
      style: Toast.Style.Success,
      title: "Translated ✓",
      message: result.translatedText,
    });
    await popToRoot();
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
