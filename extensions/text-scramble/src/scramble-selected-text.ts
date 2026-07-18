import { Clipboard, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { scrambleText } from "./scramble-text";

interface ExtensionPreferences {
  source: "selected" | "clipboard";
  action: "paste" | "copy";
  scrambleNumbers: boolean;
}

class NoTextError extends Error {
  constructor() {
    super("No text available");
    Object.setPrototypeOf(this, NoTextError.prototype);
  }
}

async function readSelection(): Promise<string> {
  try {
    return await getSelectedText();
  } catch {
    return "";
  }
}

async function readClipboard(): Promise<string> {
  try {
    return (await Clipboard.readText()) ?? "";
  } catch {
    return "";
  }
}

async function readText(preferredSource: ExtensionPreferences["source"]): Promise<string> {
  const [selected, clipboard] = await Promise.all([readSelection(), readClipboard()]);
  const sources = preferredSource === "clipboard" ? [clipboard, selected] : [selected, clipboard];
  const content = sources.find((value) => value.trim().length > 0);

  if (!content) throw new NoTextError();
  return content;
}

export default async function Command(): Promise<void> {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  try {
    const source = await readText(preferences.source);
    const scrambled = scrambleText(source, { scrambleNumbers: preferences.scrambleNumbers });

    if (scrambled === source) {
      await showHUD("Nothing to scramble");
      return;
    }

    if (preferences.action === "copy") {
      await Clipboard.copy(scrambled);
      await showHUD("Scrambled text copied");
      return;
    }

    await Clipboard.paste(scrambled);
    await showHUD("Text scrambled");
  } catch (error) {
    if (error instanceof NoTextError) {
      await showHUD("No text — select or copy something first");
      return;
    }

    console.error("Failed to scramble text", error);
    await showHUD("Couldn’t scramble text");
  }
}
