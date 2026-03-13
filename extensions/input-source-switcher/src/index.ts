import { showHUD, Clipboard, getSelectedText, getPreferenceValues } from "@raycast/api";
import { Language } from "./data";
import { transformText } from "./utils/transformText";

interface Preferences {
  langFrom: Language;
  langTo: Language;
  defaultAction: "copy" | "paste";
}

export default async function main() {
  const preferences = getPreferenceValues<Preferences>();
  const { defaultAction, langFrom, langTo } = preferences;

  try {
    const selectedText = await getSelectedText();
    const transformedText = transformText({ input: selectedText, langFrom, langTo });

    if (defaultAction === "paste") {
      await Clipboard.paste(transformedText);
      await showHUD("Transformed text pasted to active app");
    } else if (defaultAction === "copy") {
      await Clipboard.copy(transformedText);
      await showHUD("Transformed text copied to clipboard");
    }
  } catch {
    await showHUD("No text selected");
  }
}
