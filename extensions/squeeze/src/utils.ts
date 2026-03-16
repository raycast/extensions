import { Clipboard, getPreferenceValues } from "@raycast/api";

export async function outputResult(text: string): Promise<void> {
  const { autoPaste } = getPreferenceValues<Preferences>();
  if (autoPaste) {
    await Clipboard.paste(text);
  } else {
    await Clipboard.copy(text);
  }
}
