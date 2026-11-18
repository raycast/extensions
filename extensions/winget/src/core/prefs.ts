/** Extension preferences, resolved once per command session. */

import { getPreferenceValues } from "@raycast/api";

import { configureWingetPath } from "../cli/spawn";

interface WingetPreferences {
  cacheValidityMinutes?: string;
  wingetPath?: string;
}

/** Catalog TTL from the preference dropdown (default: 1 day). */
function getCatalogValidityMs(): number {
  const prefs = getPreferenceValues<WingetPreferences>();
  const minutes = Number.parseInt(prefs.cacheValidityMinutes ?? "1440", 10);
  return (Number.isNaN(minutes) ? 1440 : minutes) * 60 * 1000;
}

/** Apply preferences that configure lower layers. Call at command entry. */
function applyPreferences(): void {
  const prefs = getPreferenceValues<WingetPreferences>();
  configureWingetPath(prefs.wingetPath);
}

export { applyPreferences, getCatalogValidityMs };
