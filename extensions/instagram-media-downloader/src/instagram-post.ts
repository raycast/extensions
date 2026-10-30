/**
 * Reads a post's media out of the JSON Instagram embeds in a post page's <script> tags, as
 * returned by the Raycast browser extension. Deliberately free of `@raycast/api` so it stays
 * unit-testable; the caller does the logging.
 *
 * The scan (script isolation, one string-aware brace pass, walking outward from each
 * `"code":"…"`) is the one the Threads extension uses on the same Meta payload. What differs
 * is the choice between matches: a page names the post in more than one node, and the first
 * is often a feed stub — a reel stub carries only the poster image. So every match is judged
 * on whether it is complete, never on its position.
 */

export type MediaKind = "image" | "video";
export type PostMedia = { url: string; kind: MediaKind };

/**
 * Why the page could not supply the post, for the log — every miss falls back to the API.
 * - `not-found`: the page never names this post.
 * - `incomplete`: it does, but only as a stub, or with missing items or files. A reel reached
 *   by clicking through Instagram, rather than by loading its URL, looks like this.
 * - `expired`: the signed links in the page are out of date; the tab has been open too long.
 * - `ambiguous`: two complete nodes disagree about the post's media.
 */
export type ExtractResult = { ok: true; media: PostMedia[] } | { ok: false; reason: ExtractMissReason };
export type ExtractMissReason = "not-found" | "incomplete" | "expired" | "ambiguous";

type Candidate = { url?: unknown; width?: unknown; height?: unknown };
type MediaNode = {
  id?: unknown;
  media_type?: unknown;
  video_versions?: unknown;
  image_versions2?: { candidates?: unknown } | null;
};
type PostNode = MediaNode & { code?: unknown; carousel_media?: unknown; carousel_media_count?: unknown };

const MEDIA_TYPE = { image: 1, video: 2, carousel: 8 } as const;

/**
 * Items download one after another, each allowed up to five minutes, so a link must outlive the
 * whole set, not just the first request. Links in a freshly loaded page last days, so an hour of
 * headroom only turns away a tab left open almost until its links die.
 */
const EXPIRY_MARGIN_SECONDS = 60 * 60;

/** Index every structural `{` and where it closes, in one string-aware pass. */
function indexBraces(source: string): { opens: number[]; closeOf: Map<number, number> } {
  const opens: number[] = [];
  const closeOf = new Map<number, number>();
  const stack: number[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") {
      opens.push(i);
      stack.push(i);
    } else if (char === "}") {
      const start = stack.pop();
      if (start !== undefined) closeOf.set(start, i);
    }
  }

  return { opens, closeOf };
}

/**
 * Only script contents are scanned: one stray `"` in body text would otherwise leave the brace
 * scanner "inside a string" for the rest of the document. Each block is scanned on its own.
 */
export function scriptContents(html: string): string[] {
  const blocks: string[] = [];
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    if (match[1]) blocks.push(match[1]);
  }
  return blocks;
}

/** Every distinct object in the page that declares this `code`, innermost per occurrence. */
function findPostNodes(html: string, code: string): PostNode[] {
  const needle = new RegExp(`"code"\\s*:\\s*"${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g");
  const nodes: PostNode[] = [];

  for (const block of scriptContents(html)) {
    if (!needle.test(block)) continue;
    needle.lastIndex = 0;
    const { opens, closeOf } = indexBraces(block);

    for (const match of block.matchAll(needle)) {
      const found = match.index;
      let i = opens.length - 1;
      while (i >= 0 && opens[i] > found) i--;

      for (; i >= 0; i--) {
        const start = opens[i];
        const end = closeOf.get(start);
        if (end === undefined || end <= found) continue;
        let parsed: PostNode;
        try {
          parsed = JSON.parse(block.slice(start, end + 1)) as PostNode;
        } catch {
          continue;
        }
        if (parsed.code === code) {
          nodes.push(parsed);
          break;
        }
      }
    }
  }

  return nodes;
}

function isUsableUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0 && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** The largest usable candidate; the first one when none carries dimensions. */
export function bestUrl(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const usable = value.filter(
    (item): item is Candidate => typeof item === "object" && item !== null && isUsableUrl(item.url),
  );
  if (usable.length === 0) return null;
  const size = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : 0);
  const area = (c: Candidate) => size(c.width) * size(c.height);
  return usable.reduce((best, next) => (area(next) > area(best) ? next : best)).url as string;
}

/** One item's file, judged by its declared type; null when the type is unknown or the file is missing. */
export function itemMedia(node: unknown): PostMedia | null {
  if (typeof node !== "object" || node === null) return null;
  const item = node as MediaNode;

  if (item.media_type === MEDIA_TYPE.video) {
    const url = bestUrl(item.video_versions);
    return url ? { url, kind: "video" } : null;
  }
  if (item.media_type === MEDIA_TYPE.image) {
    const url = bestUrl(item.image_versions2?.candidates);
    return url ? { url, kind: "image" } : null;
  }
  return null;
}

/** The post's media, or null unless every item it declares is present and downloadable. */
function completeMedia(node: PostNode): PostMedia[] | null {
  if (node.media_type !== MEDIA_TYPE.carousel) {
    const single = itemMedia(node);
    return single ? [single] : null;
  }

  if (!Array.isArray(node.carousel_media) || node.carousel_media.length === 0) return null;
  // Without a count to check against, a truncated list is indistinguishable from the whole post.
  if (node.carousel_media_count !== node.carousel_media.length) return null;

  const media = node.carousel_media.map(itemMedia);
  return media.every((item): item is PostMedia => item !== null) ? media : null;
}

/** Unix seconds from a signed CDN URL's `oe` parameter (hex), or null if it has none. */
function expiresAt(url: string): number | null {
  const oe = new URL(url).searchParams.get("oe");
  if (!oe || !/^[0-9a-f]+$/i.test(oe)) return null;
  return parseInt(oe, 16);
}

/** Whether any link dies before a download of the whole set could finish. */
export function isExpiring(media: PostMedia[], nowSeconds: number): boolean {
  return media.some(({ url }) => {
    const expiry = expiresAt(url);
    return expiry !== null && expiry - nowSeconds < EXPIRY_MARGIN_SECONDS;
  });
}

/** The media's identity, ignoring the signature parameters that differ between copies. */
function identity(media: PostMedia[]): string {
  return media.map(({ url }) => new URL(url).pathname).join("\n");
}

export function extractPostMedia(html: string, shortcode: string, nowSeconds = Date.now() / 1000): ExtractResult {
  const nodes = findPostNodes(html, shortcode);
  if (nodes.length === 0) return { ok: false, reason: "not-found" };

  const complete = nodes.map(completeMedia).filter((media): media is PostMedia[] => media !== null);
  if (complete.length === 0) return { ok: false, reason: "incomplete" };

  const [media, ...others] = complete;
  if (others.some((other) => identity(other) !== identity(media))) return { ok: false, reason: "ambiguous" };

  if (isExpiring(media, nowSeconds)) return { ok: false, reason: "expired" };

  return { ok: true, media };
}
