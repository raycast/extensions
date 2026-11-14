import { getPreferenceValues, LocalStorage } from "@raycast/api";
import type { Site } from "./types";

export const SELECTED_SITE_KEY = "selected-network-site";
export const LEGACY_SELECTED_SITE_KEY = "selected-site";

interface StoredSiteSelection {
  connectionIdentity: string;
  site: Site;
}

export function getUniFiPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

function connectionIdentity(preferences: Pick<Preferences, "connectionMode" | "consoleId" | "controllerUrl">): string {
  if (preferences.connectionMode === "cloud") return `cloud:${preferences.consoleId?.trim() ?? ""}`;
  try {
    return `local:${new URL(preferences.controllerUrl.trim()).origin}`;
  } catch {
    return `local:${preferences.controllerUrl.trim()}`;
  }
}

function parseSite(value: unknown): Site | undefined {
  if (!value || typeof value !== "object") return undefined;
  const site = value as Partial<Site>;
  if (typeof site.id !== "string" || typeof site.name !== "string") return undefined;
  return { id: site.id, internalReference: site.internalReference ?? "", name: site.name };
}

async function storeSite(site: Site, identity: string): Promise<void> {
  await LocalStorage.setItem(SELECTED_SITE_KEY, JSON.stringify({ connectionIdentity: identity, site }));
}

export async function getSelectedSite(preferences = getUniFiPreferences()): Promise<Site | undefined> {
  const identity = connectionIdentity(preferences);
  const current = await LocalStorage.getItem<string>(SELECTED_SITE_KEY);
  if (current) {
    try {
      const parsed = JSON.parse(current) as Partial<StoredSiteSelection> & Partial<Site>;
      if (typeof parsed.connectionIdentity === "string") {
        return parsed.connectionIdentity === identity ? parseSite(parsed.site) : undefined;
      }

      const unscopedSite = parseSite(parsed);
      if (unscopedSite) {
        await storeSite(unscopedSite, identity);
        return unscopedSite;
      }
    } catch {
      return undefined;
    }
  }

  const legacy = await LocalStorage.getItem<string>(LEGACY_SELECTED_SITE_KEY);
  if (!legacy) return undefined;
  try {
    const site = parseSite(JSON.parse(legacy));
    if (!site) return undefined;
    await storeSite(site, identity);
    await LocalStorage.removeItem(LEGACY_SELECTED_SITE_KEY);
    return site;
  } catch {
    return undefined;
  }
}

export async function setSelectedSite(site: Site, preferences = getUniFiPreferences()): Promise<void> {
  await storeSite(site, connectionIdentity(preferences));
}

export async function requireSelectedSite(): Promise<Site> {
  const site = await getSelectedSite();
  if (!site) {
    throw new Error("Select a UniFi Network site with the Select Site command first.");
  }
  return site;
}
