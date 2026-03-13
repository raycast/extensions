import { getPreferenceValues, Clipboard, getSelectedText } from "@raycast/api";
import { analyzeText } from "./analyze";
export type CleanMode = "invisible" | "all";

export interface Preferences {
  defaultCleanMode: CleanMode;
  preferSelectedText: boolean;
  actionAfterClean: "copy" | "paste";
  showToasts: boolean;
  replaceNBSPWithSpace: boolean;
  convertSmartQuotes: boolean;
  convertDashes: boolean;
  replaceEllipsis: boolean;
  tabWidth: number | string;
  collapseMultipleSpaces: boolean;
  normalizeNFKD: boolean;
  previewShowSpaces: boolean;
  previewShowNonKeyboard: boolean;
  previewShowUnicodeTags: boolean;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export async function readPreferredTextSource(prefs: Preferences): Promise<string | undefined> {
  if (prefs.preferSelectedText) {
    try {
      const sel = await getSelectedText();
      if (sel && sel.length > 0) return sel;
    } catch {
      // fall back to clipboard
    }
  }
  const clip = await Clipboard.readText();
  return clip ?? undefined;
}

export { analyzeText };
export { fixInvisibleOnly, fixAllUnicode } from "./clean";
