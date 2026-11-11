import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { environment, Icon, Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import bundled from "../catalog/favicons.json";
import { siteFetch } from "./transport";
import { getTemplateOrigin } from "./url";

/**
 * Favicons from files instead of the network where possible. Raycast draws a remote image's slot empty until it
 * loads, so a list of sites seen for the first time fills in one icon at a time. The built-in apps and the default
 * Find Profile sites ship with theirs (assets/favicons, written by `npm run sync-catalog`), and an app added to My
 * Apps saves its own to the support directory. A saved favicon stays after its app is removed: History can still
 * show the site, and adding it again needs no download.
 */

// Raycast's favicon service first, the one getFavicon uses, so icons match Raycast's own. It answers some sites
// with an ICO or WebP (YouTube's is a 16 px ICO); Google's always answers with a PNG.
const SERVICES = [
  (key: string) => `https://api.ray.so/favicon?size=64&url=${encodeURIComponent(key)}`,
  (key: string) => `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(key)}`,
];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MASK = Image.Mask.RoundedRectangle;

const bundledKeys = new Set<string>(bundled);
const cacheDir = () => join(environment.supportPath, "favicons");
let cachedKeys: Set<string> | undefined;

function readCachedKeys(): Set<string> {
  if (!cachedKeys) {
    try {
      cachedKeys = new Set(readdirSync(cacheDir()).map((file) => file.replace(/\.png$/, "")));
    } catch {
      cachedKeys = new Set();
    }
  }
  return cachedKeys;
}

/**
 * A site's host without `www.`, which names its favicon file: `https://{profile}.substack.com/` → `substack.com`
 */
export function faviconKey(urlTemplate: string): string | undefined {
  const origin = getTemplateOrigin(urlTemplate);
  if (!origin) return undefined;
  try {
    return new URL(origin).hostname.toLowerCase().replace(/^www\./, "") || undefined;
  } catch {
    return undefined;
  }
}

export function faviconFor(urlTemplate: string): Image.ImageLike {
  const key = faviconKey(urlTemplate);
  if (!key) return Icon.Globe;
  if (bundledKeys.has(key)) return { source: `favicons/${key}.png`, mask: MASK };
  if (readCachedKeys().has(key)) return { source: join(cacheDir(), `${key}.png`), mask: MASK };
  const origin = getTemplateOrigin(urlTemplate)!;
  return getFavicon(origin, { fallback: Icon.Globe, mask: MASK });
}

/**
 * Download a site's favicon into the support directory, unless the extension already has it
 * @returns whether a favicon is available from a file now
 */
export async function cacheFavicon(urlTemplate: string, options: { fetchImpl?: typeof fetch } = {}): Promise<boolean> {
  const { fetchImpl = siteFetch } = options;
  const key = faviconKey(urlTemplate);
  if (!key) return false;
  if (bundledKeys.has(key) || readCachedKeys().has(key)) return true;
  const bytes = await downloadFavicon(key, fetchImpl);
  if (!bytes) return false;
  try {
    mkdirSync(cacheDir(), { recursive: true });
    writeFileSync(join(cacheDir(), `${key}.png`), bytes);
    readCachedKeys().add(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * A site's favicon as PNG bytes, from the first service that has one
 */
export async function downloadFavicon(key: string, fetchImpl: typeof fetch = siteFetch): Promise<Buffer | undefined> {
  for (const service of SERVICES) {
    try {
      const response = await fetchImpl(service(key), { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      // The content type can say PNG over an ICO, so check the bytes
      if (bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return bytes;
    } catch {
      // Try the next service
    }
  }
  return undefined;
}
