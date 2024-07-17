import { showHUD, Clipboard, getSelectedText } from "@raycast/api";
import { transformText } from "./utils/transformText";
import { detectLanguage } from "./utils/detectLanguage";
import { LayoutManager } from "./utils/keyboardLayout";

const languageDetectionThreshold = 0.5;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function main() {
  try {
    const selectedText = await getSelectedText();

    if (!selectedText) {
      await showHUD("No text selected");
      return;
    }

    const detectedLanguage = detectLanguage(selectedText, languageDetectionThreshold);

    if (!detectedLanguage) {
      await showHUD("Could not determine language");
      return;
    }

    const targetLanguage = detectedLanguage === "eng" ? "ukr" : "eng";
    const targetLayoutTitle = targetLanguage === "eng" ? "U.S." : "Ukrainian";

    const transformedText = transformText({
      input: selectedText,
      langFrom: detectedLanguage,
      langTo: targetLanguage,
    });

    await Clipboard.paste(transformedText);
    const emoji = targetLanguage === "eng" ? "🇬🇧" : "🇺🇦";
    await showHUD(`Transformed text pasted to active app ${emoji}`);

    const layouts = await LayoutManager.getAll();
    const targetLayout = layouts.find((layout) => layout.title === targetLayoutTitle);
    if (targetLayout) {
      await targetLayout.activate();
      await delay(1000);
      await showHUD(`Keyboard layout switched to ${targetLayoutTitle} ${emoji}`);
    } else {
      await showHUD(`Could not find layout for language: ${targetLayoutTitle}`);
    }
  } catch (error) {
    console.error("Error during transformation:", error);
    await showHUD("An error occurred");
  }
}
