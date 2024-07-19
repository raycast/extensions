import { showHUD, Clipboard, getSelectedText, getPreferenceValues } from "@raycast/api";
import { Language } from "./data";
import { transformText } from "./utils/transformText";
import { detectLanguage } from "./utils/detectLanguage";
import { LayoutManager } from "./utils/keyboardLayout";

interface Preferences {
  defaultAction: "copy" | "paste";
}

const languageDetectionThreshold = 0.5;

export default async function main() {
  const preferences = getPreferenceValues<Preferences>();
  const { defaultAction } = preferences;

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

    if (defaultAction === "paste") {
      await Clipboard.paste(transformedText);
      await showHUD("Transformed text pasted to active app");
    } else if (defaultAction === "copy") {
      await Clipboard.copy(transformedText);
      await showHUD("Transformed text copied to clipboard");
    }

    const layouts = await LayoutManager.getAll();
    const targetLayout = layouts.find((layout) => layout.title === targetLayoutTitle);
    if (targetLayout) {
      await targetLayout.activate();
      await showHUD(`Keyboard layout switched to ${targetLayoutTitle}`);
    } else {
      await showHUD(`Could not find layout for language: ${targetLayoutTitle}`);
    }
  } catch (error) {
    console.error("Error during transformation:", error);
    await showHUD("An error occurred");
  }
}
