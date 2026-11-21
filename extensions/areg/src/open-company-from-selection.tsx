import { Clipboard, getSelectedText, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { getStrings } from "./lib/strings";
import { extractOrgnr } from "./lib/orgnr";

async function selectedText(): Promise<string> {
  try {
    return await getSelectedText();
  } catch {
    // Throws when no app has a selection, so fall back to the clipboard.
    return "";
  }
}

export default async function Command() {
  const orgnr = extractOrgnr(await selectedText()) ?? extractOrgnr((await Clipboard.readText()) ?? "");
  if (!orgnr) {
    await showHUD(getStrings().lookupNoOrgnr);
    return;
  }
  try {
    await launchCommand({ name: "search-companies", type: LaunchType.UserInitiated, context: { orgnr } });
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : getStrings().openFailed);
  }
}
