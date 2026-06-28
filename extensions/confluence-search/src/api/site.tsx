import { Url } from "url";
import { LocalStorage } from "@raycast/api";
import { fetchSites } from "./atlassian";

const ACTIVE_SITE = "activeSite";

export async function setActiveSite(activeSite: Site) {
  await LocalStorage.setItem(ACTIVE_SITE, JSON.stringify(activeSite));
  return activeSite;
}

async function getActiveSite() {
  const item = (await LocalStorage.getItem(ACTIVE_SITE)) as string;
  return item ? (JSON.parse(item) as Site) : undefined;
}

export function hasSiteGotRequiredScopes(site: Site, requiredScopes: string[]) {
  return site.scopes.length >= requiredScopes.length && requiredScopes.every((scope) => site.scopes.includes(scope));
}

export async function getOrSetDefaultSite(forceRefresh = false) {
  const maybeActiveSite = await getActiveSite();

  if (maybeActiveSite && !forceRefresh) {
    return maybeActiveSite;
  } else {
    const sites = await fetchSites();

    const selectedSite = maybeActiveSite ? sites.find((s) => s.id === maybeActiveSite.id) || sites[0] : sites[0];

    console.info(`Setting active site to ${selectedSite.url}`);
    return await setActiveSite(selectedSite);
  }
}

export interface Site {
  id: string;
  url: string;
  name: string;
  scopes: Array<string>;
  avatarUrl: Url;
}

export const nullSite = {} as Site;
