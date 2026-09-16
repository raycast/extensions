import { getPreferenceValues, LocalStorage } from "@raycast/api";
import type { Site } from "./types";

export const SELECTED_SITE_KEY = "selected-network-site";

export interface UniFiPreferences {
  apiKey: string;
  connectionMode: "local" | "cloud";
  consoleId?: string;
  controllerUrl: string;
  dateFormat?: string;
  verifyTlsCertificates?: boolean;
}

export function getUniFiPreferences(): UniFiPreferences {
  return getPreferenceValues<UniFiPreferences>();
}

export async function getSelectedSite(): Promise<Site | undefined> {
  const value = await LocalStorage.getItem<string>(SELECTED_SITE_KEY);
  if (!value) return undefined;
  try {
    const site = JSON.parse(value) as Partial<Site>;
    return typeof site.id === "string" && typeof site.name === "string" ? (site as Site) : undefined;
  } catch {
    return undefined;
  }
}

export async function setSelectedSite(site: Site): Promise<void> {
  await LocalStorage.setItem(SELECTED_SITE_KEY, JSON.stringify(site));
}

export async function requireSelectedSite(): Promise<Site> {
  const site = await getSelectedSite();
  if (!site) {
    throw new Error("Select a UniFi Network site with the Select Site command first.");
  }
  return site;
}
