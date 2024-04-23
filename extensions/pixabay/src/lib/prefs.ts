import { getPreferenceValues } from "@raycast/api";

import { resolveFilepath } from "@/lib/utils";

const prefs = getPreferenceValues<Preferences>();

export function getResultsPerPage(): number {
  if (!prefs.resultsPerPage) {
    return 50;
  }
  const parsed = parseInt(prefs.resultsPerPage, 10);
  return isNaN(parsed) ? 50 : parsed < 3 ? 3 : parsed > 200 ? 200 : parsed;
}

export function getDownloadFolder(): string {
  const d = "~/Downloads";
  const folder = (prefs.downloadFolder as string) || d;
  return resolveFilepath(folder);
}

export function showInFolderAfterDownload(): boolean {
  return prefs.showinfinder ?? true;
}

export function hasSafeSearch(): boolean {
  return prefs.safeSearch ?? true;
}
