import { getPreferenceValues } from "@raycast/api";
import { AutoRefreshInterval } from "./types";

// `Preferences` is the ambient type Raycast generates in raycast-env.d.ts from package.json —
// declaring our own copy here would drift silently if the manifest changes.

export function getImagesFolder(): string {
  return getPreferenceValues<Preferences>().folder;
}

export function getFillGridItems(): boolean {
  return getPreferenceValues<Preferences>().fillGridItems;
}

export function getAutoRefreshInterval(): AutoRefreshInterval {
  return getPreferenceValues<Preferences>().autoRefreshInterval;
}
