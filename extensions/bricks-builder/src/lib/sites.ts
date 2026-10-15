import { Cache, LocalStorage } from "@raycast/api";

export interface Site {
  id: string;
  name: string;
  /** Site home URL without a trailing slash, e.g. https://example.com */
  url: string;
  username?: string;
  /** WordPress application password (Users › Profile › Application Passwords). */
  appPassword?: string;
  /** Accept self-signed HTTPS certificates, for local sites (Local, DDEV, Herd). */
  allowSelfSigned?: boolean;
}

const STORAGE_KEY = "sites";

export async function loadSites(): Promise<Site[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Site[];
  } catch {
    return [];
  }
}

/**
 * The site last picked in any command (what useSelectedSite stores under "selected-site"), for
 * commands without a view; falls back to the first site.
 */
export async function loadSelectedSite(): Promise<Site | undefined> {
  const sites = await loadSites();
  let id: string | undefined;
  try {
    const raw = new Cache().get("selected-site");
    id = raw ? (JSON.parse(raw) as string) : undefined;
  } catch {
    id = undefined;
  }
  return sites.find((s) => s.id === id) ?? sites[0];
}

export async function saveSites(sites: Site[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
}

export async function upsertSite(site: Site): Promise<void> {
  const sites = await loadSites();
  const index = sites.findIndex((s) => s.id === site.id);
  if (index >= 0) sites[index] = site;
  else sites.push(site);
  await saveSites(sites);
}

export async function removeSite(id: string): Promise<void> {
  await saveSites((await loadSites()).filter((s) => s.id !== id));
}

export function normalizeSiteUrl(input: string): string {
  let value = input.trim();
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  const url = new URL(value);
  return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
}

/** The saved site whose URL the given page URL lives under, if any. */
export function findSiteForUrl(sites: Site[], pageUrl: URL): Site | undefined {
  return sites
    .filter((site) => {
      const siteUrl = new URL(site.url);
      return siteUrl.host === pageUrl.host && pageUrl.pathname.startsWith(siteUrl.pathname);
    })
    .sort((a, b) => b.url.length - a.url.length)[0];
}

/**
 * Adds or updates sites from an export, matching by id, then by URL. Sites exported without
 * passwords keep the password already saved here.
 */
export async function importSites(incoming: Site[]): Promise<{ added: number; updated: number }> {
  const sites = await loadSites();
  let added = 0;
  let updated = 0;
  for (const raw of incoming) {
    if (!raw || typeof raw.url !== "string" || typeof raw.name !== "string") continue;
    const index = sites.findIndex((s) => s.id === raw.id || s.url === raw.url);
    if (index >= 0) {
      const existing = sites[index];
      sites[index] = { ...existing, ...raw, id: existing.id, appPassword: raw.appPassword ?? existing.appPassword };
      updated++;
    } else {
      sites.push({ ...raw, id: typeof raw.id === "string" ? raw.id : `${Date.now()}-${added}` });
      added++;
    }
  }
  await saveSites(sites);
  return { added, updated };
}
