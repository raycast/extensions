import { getPreferenceValues } from "@raycast/api";
import { AutoRefreshInterval } from "./types";

export interface Preferences {
  folder: string;
  fillGridItems: boolean;
  autoRefreshInterval: AutoRefreshInterval;
}

export function getImagesFolder(): string {
  return getPreferenceValues<Preferences>().folder;
}

export function getFillGridItems(): boolean {
  return getPreferenceValues<Preferences>().fillGridItems;
}

export function getAutoRefreshInterval(): AutoRefreshInterval {
  return getPreferenceValues<Preferences>().autoRefreshInterval;
}
