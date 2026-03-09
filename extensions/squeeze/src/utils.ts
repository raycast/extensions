import { Clipboard, getPreferenceValues } from "@raycast/api";

interface ExtensionPreferences {
  autoPaste: boolean;
}

export async function outputResult(text: string): Promise<void> {
  const { autoPaste } = getPreferenceValues<ExtensionPreferences>();
  if (autoPaste) {
    await Clipboard.paste(text);
  } else {
    await Clipboard.copy(text);
  }
}
