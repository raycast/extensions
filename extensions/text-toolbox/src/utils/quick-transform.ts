import { Clipboard, closeMainWindow, getSelectedText, showHUD, getPreferenceValues } from "@raycast/api";
import { Transformation } from "../transformations";

type TextSource = "selectedOnly" | "preferSelected" | "clipboardOnly" | "preferClipboard";
type ResultBehavior = "copy" | "paste";

interface Preferences {
  textSource: TextSource;
  resultBehavior: ResultBehavior;
}

async function getInputText(textSource: TextSource): Promise<string | null> {
  switch (textSource) {
    case "selectedOnly":
      try {
        return await getSelectedText();
      } catch {
        await showHUD("❌ No text selected");
        return null;
      }

    case "preferSelected":
      try {
        return await getSelectedText();
      } catch {
        const clipboardText = await Clipboard.readText();
        if (!clipboardText) {
          await showHUD("❌ No text selected or in clipboard");
          return null;
        }
        return clipboardText;
      }

    case "clipboardOnly": {
      const clipboardText = await Clipboard.readText();
      if (!clipboardText) {
        await showHUD("❌ No text in clipboard");
        return null;
      }
      return clipboardText;
    }

    case "preferClipboard": {
      const clipboard = await Clipboard.readText();
      if (clipboard) {
        return clipboard;
      }
      try {
        return await getSelectedText();
      } catch {
        await showHUD("❌ No text in clipboard or selected");
        return null;
      }
    }
  }
}

export async function quickTransform(transformation: Transformation) {
  try {
    await closeMainWindow();

    const preferences = getPreferenceValues<Preferences>();

    const text = await getInputText(preferences.textSource);
    if (!text) {
      return;
    }

    const result = transformation.transform(text);

    if (preferences.resultBehavior === "paste") {
      await Clipboard.paste(result);
      await showHUD(`✓ ${transformation.name}`);
    } else {
      await Clipboard.copy(result);
      await showHUD(`✓ ${transformation.name} (copied)`);
    }
  } catch (error) {
    await showHUD(`❌ Error: ${error}`);
  }
}
