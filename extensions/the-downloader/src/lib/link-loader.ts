import { Cache, getPreferenceValues } from "@raycast/api";
import { resolveBrowser } from "./browsers.js";
import { detectSource } from "./detect.js";
import { LinkContext, LinkKind, LinkLoadError, hasBody } from "./link-context.js";
import { loadArchivedPage } from "./sources/archive.js";
import { loadPageLink } from "./sources/page.js";
import { loadPostLink } from "./sources/post.js";
import { loadVideoLink } from "./sources/video.js";
import { isValidUrl, normalizeUrl } from "./url.js";

// The one way into a link for the chat and the AI tools: validate the URL,
// route it to the video, post or page reader, and keep the result for a few
// hours so reopening a recent chat is instant.

const cache = new Cache({ namespace: "link-context" });
const TTL_MS = 6 * 60 * 60 * 1000;

/** Which reader a link goes to: the Download command's routing, with galleries read as posts. */
export function linkKindOf(url: string): LinkKind | "spotify" {
  switch (detectSource(url)) {
    case "video":
      return "video";
    case "gallery":
      return "post";
    case "spotify":
      return "spotify";
    default:
      return "page";
  }
}

function cookiesFromBrowser(): string | undefined {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  return resolveBrowser(prefs.cookiesFromBrowser ?? "", prefs.cookiesFromBrowserCustom).spec || undefined;
}

/**
 * The live page, or — with `fallback`, when it refuses (a bot wall, a dead
 * link) or has no readable text — the Internet Archive's copy. A login, a
 * paywall or a legal block never falls back (page.ts offers no archive fix
 * for them), and neither does a refused local address: it isn't a LinkLoadError.
 */
async function readPage(url: string, signal: AbortSignal | undefined, fallback: boolean): Promise<LinkContext> {
  let live: LinkContext;
  try {
    live = await loadPageLink(url, { signal });
  } catch (error) {
    if (!fallback || !(error instanceof LinkLoadError) || error.fix !== "archive") throw error;
    return loadArchivedPage(url, { signal }).catch(() => {
      throw error;
    });
  }
  if (!fallback || hasBody(live)) return live;
  return loadArchivedPage(url, { signal }).catch(() => live);
}

/**
 * Everything the chat can know about `url`. Rejects anything that isn't an
 * http(s) link before a tool or a request sees it, so a value such as
 * `--batch-file=…` can never reach yt-dlp or gallery-dl as an option.
 */
export async function loadLinkContext(
  raw: string,
  options: {
    signal?: AbortSignal;
    language?: string;
    force?: boolean;
    /** Pages: read the Internet Archive's saved copy instead of the live page. */
    archived?: boolean;
    /** Pages: when the live page refuses or has no text, try the Internet Archive's copy (for the AI tools). */
    archiveFallback?: boolean;
  } = {},
): Promise<LinkContext> {
  const trimmed = raw.trim();
  if (!trimmed || !isValidUrl(trimmed)) throw new Error("Invalid URL — provide an http(s) link.");
  const url = normalizeUrl(trimmed);
  const kind = linkKindOf(url);
  if (kind === "spotify") throw new Error("Spotify links aren't supported in chat yet.");

  const archived = kind === "page" && !!options.archived;
  const language = kind === "video" ? options.language?.trim() || "auto" : archived ? "archive" : "-";
  const key = `${kind}|${language}|${url}`;
  if (!options.force) {
    const raw = cache.get(key);
    if (raw) {
      try {
        const cached = JSON.parse(raw) as LinkContext;
        if (Date.now() - cached.fetchedAt < TTL_MS) return cached;
      } catch {
        /* corrupt entry — read again */
      }
    }
  }

  const ctx =
    kind === "video"
      ? await loadVideoLink(url, { signal: options.signal, language })
      : kind === "post"
        ? await loadPostLink(url, { signal: options.signal, cookiesFromBrowser: cookiesFromBrowser() })
        : archived
          ? await loadArchivedPage(url, { signal: options.signal })
          : await readPage(url, options.signal, !!options.archiveFallback);

  // Without a body, read again next time: captions may have been rate-limited, or a login added since.
  if (hasBody(ctx)) {
    try {
      // An archived copy the tools fell back to is kept apart from the live page.
      cache.set(ctx.archive ? `${kind}|archive|${url}` : key, JSON.stringify(ctx));
    } catch {
      /* cache full or unavailable — not worth failing over */
    }
  }
  return ctx;
}
