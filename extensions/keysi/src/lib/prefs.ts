import { getPreferenceValues } from "@raycast/api";
import { BUILTIN_SHEET_DIRS } from "./sheets";

/**
 * Where to look for the bundled sheets.
 *
 * `/Applications` and `~/Applications` cover almost everyone, but Keysi is a
 * direct download, so "almost" leaves real people with an empty list and no
 * way to fix it — the README used to simply record that as a limitation.
 * The preference wins when it is set, and the defaults stay behind it so
 * that pointing it at the wrong bundle is not a way to break a working
 * install.
 */
export function builtinSheetDirs(): string[] {
  let configured: string | undefined;
  try {
    configured = getPreferenceValues<Preferences>().keysiApp?.path;
  } catch {
    // `getPreferenceValues` throws outside a command context. Nothing here
    // is worth failing a search over.
    configured = undefined;
  }
  if (!configured) return BUILTIN_SHEET_DIRS;
  const fromPreference = `${configured.replace(/\/+$/, "")}/Contents/Resources/BuiltinSheets`;
  return [...BUILTIN_SHEET_DIRS.filter((dir) => dir !== fromPreference), fromPreference];
}
