import {
  AI,
  Clipboard,
  getPreferenceValues,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

interface Preferences {
  targetLanguage: "auto" | "english" | "chinese" | "japanese";
}

const languageNames: Record<string, string> = {
  english: "English",
  chinese: "Simplified Chinese",
  japanese: "Japanese",
};

function buildPrompt(targetLanguage: string, selectedText: string): string {
  if (targetLanguage === "auto") {
    // Auto-detect: Chinese <-> English translation
    return `Detect the language of the following text. If it's Chinese, translate to English. If it's English or other languages, translate to Simplified Chinese. Only output the translation, nothing else. Do not add quotes or explanations.

Text to translate:
${selectedText}`;
  }

  const targetLangName = languageNames[targetLanguage];
  return `Translate the following text to ${targetLangName}. Only output the translation, nothing else. Do not add quotes or explanations.

Text to translate:
${selectedText}`;
}

export default async function Command() {
  const { targetLanguage } = getPreferenceValues<Preferences>();

  try {
    // 1. Get selected text
    const selectedText = await getSelectedText();

    if (!selectedText || selectedText.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text selected",
        message: "Please select some text to translate",
      });
      return;
    }

    // 2. Show loading HUD
    await showHUD("Translating...");

    // 3. Call Raycast AI for translation
    const prompt = buildPrompt(targetLanguage, selectedText);

    const translatedText = await AI.ask(prompt, {
      creativity: "low",
    });

    if (!translatedText || translatedText.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Translation failed",
        message: "Could not get translation result",
      });
      return;
    }

    // 4. Paste to replace selected text
    await Clipboard.paste(translatedText.trim());

    // 5. Show success
    const successMsg =
      targetLanguage === "auto"
        ? "Translated ✓"
        : `Translated to ${languageNames[targetLanguage]} ✓`;
    await showHUD(successMsg);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await showToast({
      style: Toast.Style.Failure,
      title: "Translation error",
      message: errorMessage,
    });
  }
}
