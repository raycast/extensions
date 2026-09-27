import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { getTranslatePreferences } from "./lib/preferences";
import { translateText } from "./lib/translate";
import { showTranslateErrorToast } from "./utils/error-toast";

export default async function Command() {
  const clipboardText = await Clipboard.readText();

  if (!clipboardText || !clipboardText.trim()) {
    await showHUD("Clipboard is empty");
    return;
  }

  const { targetLanguage } = getTranslatePreferences();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Translating…" });

  try {
    const translation = await translateText({ text: clipboardText, targetLanguage });
    await Clipboard.copy(translation);
    await toast.hide();
    await showHUD("Translation copied to clipboard");
  } catch (error) {
    await toast.hide();
    await showTranslateErrorToast(error);
  }
}
