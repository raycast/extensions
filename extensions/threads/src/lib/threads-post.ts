import { CRAWLER_USER_AGENT, THREADS_HOSTS } from "./constants";

/**
 * What the post says the media *is*. Taken from the payload, never guessed from the URL or
 * the response headers — Threads serves voice posts as `Content-Type: video/mp4` even though
 * they are AAC audio with no video track, so the header cannot be trusted for this. The names
 * mirror the public API's `media_type` vocabulary (IMAGE / VIDEO / AUDIO).
 */
export type MediaKind = "image" | "video" | "audio";

export type ThreadsMedia = {
  url: string;
  kind: MediaKind;
};

export type ThreadsPost = {
  /** Canonical `/@user/post/<code>` URL the input resolved to. */
  canonicalUrl: string;
  /** Shortcode of the post, e.g. `DdCYkFvlDvi`. */
  code: string;
  media: ThreadsMedia[];
};

/**
 * Deliberately free of `@raycast/api` (and therefore of the logger, which reads
 * `getPreferenceValues`) so it stays unit-testable outside Raycast — the same rule the rest
 * of the fleet follows. Diagnostics travel out in the returned value and in error messages;
 * the Raycast-side caller does the logging.
 */

/** Shape of the post object embedded in Threads' server-rendered HTML. Remote and untrusted. */
type MediaCandidate = { url?: unknown; width?: unknown; height?: unknown };
type MediaNode = {
  video_versions?: unknown;
  image_versions2?: { candidates?: unknown } | null;
  /** Voice posts carry a single `audio_src` here instead of any versions array. */
  audio?: { audio_src?: unknown } | null;
};
type PostNode = MediaNode & {
  code?: unknown;
  carousel_media?: unknown;
};

/** The page is ~1 MB; a stalled read must not hang the command forever. */
const RESOLVE_TIMEOUT_MS = 30_000;

/**
 * Index every structural `{` in one string-aware pass, recording where each one closes.
 *
 * The naive approach — walk backwards from the shortcode and brace-match forward from each
 * `{` — rescans toward the end of the document once per candidate, so a caption containing
 * many braces turns resolution quadratic (measured: 2.5s for 1,000 braces, 11s for 5,000).
 * One pass with a stack makes each lookup O(1) instead.
 */
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
 * Media a node actually yields — not merely the presence of the keys. `video_versions: []`
 * is truthy, so a key-presence test accepts an empty reference node and reports a post with
 * media as having none.
 */
function extractMedia(node: PostNode): ThreadsMedia[] {
  const carousel = Array.isArray(node.carousel_media) ? node.carousel_media : null;
  const nodes: unknown[] = carousel?.length ? carousel : [node];
  return nodes.map(pickMedia).filter((item): item is ThreadsMedia => item !== null);
}

/**
 * The payload lives inside `<script>` elements, and only their contents may be scanned.
 *
 * `indexBraces` treats every `"` as a JSON string delimiter, so a single stray quote
 * anywhere earlier in the document — `5" nails` in body text, or one inside an HTML
 * comment — leaves the scanner stuck "inside a string" and it never indexes the payload's
 * braces at all. The post then fails with "Couldn't read this post's media" for a reason
 * that has nothing to do with the post. Real pages survive only because their ~340 quotes
 * outside `<script>` happen to be even.
 *
 * Each block is scanned independently, so an unbalanced quote in one script cannot corrupt
 * another. A document with no script tags is scanned whole, which keeps bare-JSON fixtures
 * working.
 */
function scriptContents(html: string): string[] {
  const blocks: string[] = [];
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    if (match[1]) blocks.push(match[1]);
  }
  return blocks.length > 0 ? blocks : [html];
}

/**
 * The page embeds the whole surrounding feed, so the shortcode appears in unrelated nodes
 * too — including bare `{"code":"…"}` back-references that carry no media. Walk outward
 * from each occurrence and accept the innermost object that both declares this `code` and
 * actually carries media, falling back to a media-less match so a text post still resolves.
 */
function findPostNode(html: string, code: string): PostNode | null {
  let fallback: PostNode | null = null;

  for (const block of scriptContents(html)) {
    const found = findPostNodeIn(block, code);
    if (!found) continue;
    if (extractMedia(found).length > 0) return found;
    fallback ??= found;
  }

  return fallback;
}

function findPostNodeIn(html: string, code: string): PostNode | null {
  // Known ceiling: each occurrence of the shortcode restarts the outward walk, so cost is
  // quadratic in the number of bare back-references. Measured 2026-09-09 — 10 refs: 2ms,
  // 100: 3ms, 500: 27ms, 2000: 272ms. Real pages carry 4-10, so this is 2-3ms in practice.
  // Fix by caching parsed candidate intervals if a page ever arrives with hundreds.
  // Tolerate whitespace around the separator; today's payload is minified, but a formatted
  // response would otherwise silently stop matching.
  const needle = new RegExp(`"code"\\s*:\\s*"${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g");
  const { opens, closeOf } = indexBraces(html);

  let fallback: PostNode | null = null;

  for (const match of html.matchAll(needle)) {
    const found = match.index;

    // Candidate objects are those opening before the shortcode and closing after it.
    let candidateIndex = opens.length - 1;
    while (candidateIndex >= 0 && opens[candidateIndex] > found) candidateIndex--;

    for (let i = candidateIndex; i >= 0; i--) {
      const start = opens[i];
      const end = closeOf.get(start);
      if (end === undefined || end <= found) continue;

      let parsed: PostNode;
      try {
        parsed = JSON.parse(html.slice(start, end + 1)) as PostNode;
      } catch {
        continue; // Not a self-contained object at this offset — keep widening.
      }

      if (parsed.code !== code) continue;
      // Keep widening past a node that names this post but carries nothing extractable;
      // a text-only post legitimately has none, so hold the first as a fallback.
      if (extractMedia(parsed).length > 0) return parsed;
      fallback ??= parsed;
    }
  }

  return fallback;
}

function isUsableUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    // A prefix test alone accepts the bare string "https://", which then sorts as a
    // candidate and can displace a real one.
    return parsed.protocol === "https:" && parsed.hostname.length > 0 && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function toCandidates(value: unknown): MediaCandidate[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is MediaCandidate =>
      typeof item === "object" && item !== null && isUsableUrl((item as MediaCandidate).url),
  );
}

/** Pick the highest-resolution candidate, preferring video over the video's poster image. */
function pickMedia(node: unknown): ThreadsMedia | null {
  if (typeof node !== "object" || node === null) return null;
  const media = node as MediaNode;

  const dimension = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
  const area = (candidate: MediaCandidate) => dimension(candidate.width) * dimension(candidate.height);
  const best = (candidates: MediaCandidate[]) => candidates.reduce((a, b) => (area(b) > area(a) ? b : a));

  const videos = toCandidates(media.video_versions);
  if (videos.length > 0) return { url: best(videos).url as string, kind: "video" };

  const images = toCandidates(media.image_versions2?.candidates);
  if (images.length > 0) return { url: best(images).url as string, kind: "image" };

  // A voice post has neither versions array — just one source URL.
  const audio = media.audio?.audio_src;
  if (isUsableUrl(audio)) return { url: audio, kind: "audio" };

  return null;
}

function assertThreadsUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("That doesn't look like a URL. Copy the link from Threads and try again.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`Expected an https link, got ${parsed.protocol.replace(":", "")}.`);
  }

  if (parsed.username || parsed.password) {
    throw new Error("That link contains embedded credentials. Copy the link from Threads and try again.");
  }

  if (!THREADS_HOSTS.includes(parsed.hostname)) {
    throw new Error(`Expected a threads.com link, got ${parsed.hostname}.`);
  }

  // The whole flow depends on a redirect we must be able to trust; never issue it in the clear.
  parsed.protocol = "https:";
  return parsed;
}

/**
 * Resolve any Threads post link — canonical, tracking-decorated (`?xmt=…`), or a
 * `/share/<id>/` short link — to its canonical URL and the media it contains.
 */
export async function resolveThreadsPost(rawUrl: string): Promise<ThreadsPost> {
  const url = assertThreadsUrl(rawUrl);

  // `redirect: "follow"` is the default; `response.url` is therefore the post's canonical
  // URL after a /share/ link has been followed.
  const response = await fetch(url, {
    headers: { "User-Agent": CRAWLER_USER_AGENT },
    signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Threads returned ${response.status} ${response.statusText} for this link.`);
  }

  // Threads bounces a post it will not serve to a signed-out request to
  // `/?error=invalid_post`. Observed to be per-POST, not per-account: sibling posts from
  // the same public account resolve fine, and it happens on the canonical URL as much as on
  // a /share/ link — so it is neither a bad link nor a share-link bug, and reporting it as
  // one sends you looking in the wrong place.
  const bounce = new URL(response.url).searchParams.get("error");
  if (bounce) {
    throw new Error(
      "Threads refused to serve this post to a signed-out request. It may be restricted or " +
        "deleted, or visible only while you're signed in to Threads — other posts from the " +
        "same account may still work.",
    );
  }

  const html = await response.text();

  // Require a complete path segment, so `/post/ABC.extra` isn't read as `ABC`.
  const code = new URL(response.url).pathname.match(/\/post\/([A-Za-z0-9_-]+)(?:\/|$)/)?.[1];

  if (!code) {
    throw new Error(`That link didn't resolve to a Threads post — it ended up at ${new URL(response.url).pathname}.`);
  }

  const post = findPostNode(html, code);
  if (!post) {
    throw new Error("Couldn't read this post's media. It may be private, deleted, or age-restricted.");
  }

  const media = extractMedia(post);

  return { canonicalUrl: response.url, code, media };
}
