import { Clipboard, getPreferenceValues, getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { encode } from "@toon-format/toon";

interface Preferences {
  defaultAction: "copy" | "paste";
  inputSource: "auto" | "clipboard";
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  try {
    let text = "";

    if (preferences.inputSource === "auto") {
      try {
        text = await getSelectedText();
      } catch {
        // Ignore error, fallback to clipboard
      }
    }

    if (!text || !text.trim()) {
      text = (await Clipboard.readText()) || "";
    }

    if (!text.trim()) {
      await showHUD("No JSON found - selection and clipboard are empty");
      return;
    }

    const parsedJson = JSON.parse(text);
    const toonString = encode(parsedJson);

    if (preferences.defaultAction === "copy") {
      await Clipboard.copy(toonString);
      await showHUD("Converted! TOON format copied to clipboard");
    } else {
      await Clipboard.paste(toonString);
      await showHUD("Converted! TOON format pasted to active app");
    }
  } catch (error) {
    console.error(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Conversion Failed",
      message: error instanceof Error ? error.message : "Check your JSON input",
    });
  }
}
