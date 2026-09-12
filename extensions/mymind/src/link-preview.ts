import { Cache } from "@raycast/api";
import { LinkPreview, parseLinkPreview } from "./link-preview-parser";

const cache = new Cache({ namespace: "link-preview" });
const SUCCESS_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const FAILURE_TTL_MS = 1000 * 60 * 60 * 6;

type CachedLinkPreview = {
  fetchedAt: number;
  preview: LinkPreview | null;
};

function getCacheKey(url: string): string {
  return `preview:${url}`;
}

function readCachedLinkPreview(url: string): LinkPreview | null | undefined {
  const raw = cache.get(getCacheKey(url));

  if (!raw) {
    return undefined;
  }

  try {
    const cached = JSON.parse(raw) as CachedLinkPreview;
    const ttl = cached.preview ? SUCCESS_TTL_MS : FAILURE_TTL_MS;

    if (Date.now() - cached.fetchedAt > ttl) {
      cache.remove(getCacheKey(url));
      return undefined;
    }

    return cached.preview;
  } catch {
    cache.remove(getCacheKey(url));
    return undefined;
  }
}

function writeCachedLinkPreview(url: string, preview: LinkPreview | null) {
  cache.set(
    getCacheKey(url),
    JSON.stringify({
      fetchedAt: Date.now(),
      preview,
    } satisfies CachedLinkPreview),
  );
}

export async function getLinkPreview(url: string): Promise<LinkPreview | undefined> {
  const cached = readCachedLinkPreview(url);

  if (cached !== undefined) {
    return cached ?? undefined;
  }

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "raycast-mymind/2.0 link-preview",
      },
    });

    if (!response.ok) {
      writeCachedLinkPreview(url, null);
      return undefined;
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("text/html")) {
      writeCachedLinkPreview(url, null);
      return undefined;
    }

    const html = (await response.text()).slice(0, 250_000);
    const preview = parseLinkPreview(html, response.url || url);
    writeCachedLinkPreview(
      url,
      preview.imageUrl || preview.title || preview.description || preview.siteName ? preview : null,
    );
    return preview.imageUrl || preview.title || preview.description || preview.siteName ? preview : undefined;
  } catch {
    return undefined;
  }
}
