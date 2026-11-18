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
  /** Where WordPress itself lives (its "WordPress Address"), when that's a subfolder of the site's home URL. */
  adminUrl?: string;
}

const STORAGE_KEY = "sites";

/** A wp-admin URL for the site, e.g. wpAdminUrl(site, "update-core.php"). */
export const wpAdminUrl = (site: Site, path = "") => `${site.adminUrl ?? site.url}/wp-admin/${path}`;

/**
 * The site without its application password, for anything that ends up in Raycast's cache, which
 * is stored unencrypted on disk. Swap the full site back in from loadSites() before using it.
 */
export const withoutSecrets = (site: Site): Site => ({ ...site, appPassword: undefined });

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

/** How much of `pageUrl` the base URL covers, or -1 when the page doesn't live under it. */
function matchLength(base: string, pageUrl: URL): number {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return -1; // A hand-edited entry shouldn't break the lookup for every other site.
  }
  // Match whole path segments, so a site at /blog doesn't claim /blog2.
  const path = url.pathname.replace(/\/+$/, "");
  const under = pageUrl.pathname === path || pageUrl.pathname.startsWith(`${path}/`);
  return url.host === pageUrl.host && under ? path.length : -1;
}

/**
 * The saved site whose URL the given page URL lives under, if any. Also checks WordPress's own
 * address, so wp-admin pages of WordPress in a subfolder are found; the most specific match wins.
 */
export function findSiteForUrl(sites: Site[], pageUrl: URL): Site | undefined {
  let best: { site: Site; length: number } | undefined;
  for (const site of sites) {
    const length = Math.max(matchLength(site.url, pageUrl), site.adminUrl ? matchLength(site.adminUrl, pageUrl) : -1);
    if (length >= 0 && (!best || length > best.length)) best = { site, length };
  }
  return best?.site;
}

/**
 * Adds or updates sites from an export, matching by id, then by URL. Sites exported without
 * passwords keep the password already saved here.
 */
export async function importSites(incoming: Site[]): Promise<{ added: number; updated: number; skipped: number }> {
  const sites = await loadSites();
  let added = 0;
  let updated = 0;
  let skipped = 0;
  for (const entry of incoming) {
    if (!entry || typeof entry.url !== "string" || typeof entry.name !== "string") {
      skipped++;
      continue;
    }
    // Normalize like the site form does; a hand-edited "example.com" would otherwise break URL parsing later.
    let raw: Site;
    try {
      raw = { ...entry, url: normalizeSiteUrl(entry.url) };
      // Only when the file has one: an older export without adminUrl keeps the one saved here.
      if (typeof entry.adminUrl === "string") raw.adminUrl = normalizeSiteUrl(entry.adminUrl);
      else delete raw.adminUrl;
    } catch {
      skipped++;
      continue;
    }
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
  return { added, updated, skipped };
}
