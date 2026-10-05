import { LocalStorage, environment } from "@raycast/api";

import { jsrUrls } from "@/lib/jsrUrls";
import { type CachedOramaCreds, ORAMA_CACHE_KEY, isCachedOramaCredsExpired } from "@/lib/oramaCache";
import { type OramaCreds, parseBootPayload } from "@/lib/parseBootPayload";

const readCache = async (): Promise<CachedOramaCreds | null> => {
  const raw = await LocalStorage.getItem<string>(ORAMA_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedOramaCreds;
  } catch {
    return null;
  }
};

const writeCache = async (creds: OramaCreds): Promise<void> => {
  const entry: CachedOramaCreds = { ...creds, cachedAt: Date.now() };
  await LocalStorage.setItem(ORAMA_CACHE_KEY, JSON.stringify(entry));
};

const scrapeCreds = async (): Promise<OramaCreds> => {
  const res = await fetch(jsrUrls.site.home(), {
    headers: {
      Agent: `Raycast/${environment.raycastVersion} ${environment.extensionName} (https://raycast.com)`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch jsr.io homepage: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const creds = parseBootPayload(text);
  if (!creds) {
    throw new Error("Failed to extract Orama credentials from jsr.io");
  }
  await writeCache(creds);
  return creds;
};

/**
 * Resolve Orama Cloud credentials for jsr.io search.
 *
 * Shares the same LocalStorage key/format as the React `useSearchAPIData` hook,
 * so the cache is reused between the React UI and headless contexts (AI tools).
 *
 * @param forceRefresh - When true, bypass cache and re-scrape jsr.io (e.g. after a 401).
 */
export const getOramaCreds = async (forceRefresh = false): Promise<OramaCreds> => {
  if (!forceRefresh) {
    const cached = await readCache();
    if (cached && !isCachedOramaCredsExpired(cached)) {
      return { projectId: cached.projectId, apiKey: cached.apiKey };
    }
  }
  return scrapeCreds();
};
