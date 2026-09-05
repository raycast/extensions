import { Clipboard, getSelectedText } from "@raycast/api";

export async function getInitialText(preloadTextAutomatically: boolean): Promise<string> {
  if (!preloadTextAutomatically) return "";

  try {
    return await getSelectedText();
  } catch {
    return (await Clipboard.readText()) ?? "";
  }
}
