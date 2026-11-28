export type InstagramPostKind = "post" | "reel";

export type InstagramPostRef = {
  /** Case-sensitive: `AbC` and `abc` are different posts. */
  shortcode: string;
  kind: InstagramPostKind;
};

const HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]);
const SHORTCODE = /^[A-Za-z0-9_-]+$/;
// A Map, so inherited object names (`constructor`, `__proto__`) are never kinds.
const KIND_BY_SEGMENT = new Map<string, InstagramPostKind>([
  ["p", "post"],
  ["reel", "reel"],
  ["reels", "reel"],
]);

/**
 * An Instagram URL, or null for anything else: an exact Instagram host, http(s) only, no
 * credentials. A link typed without a scheme (`instagram.com/p/…`) is read as https.
 */
function parseInstagramUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;
  return url;
}

/**
 * The one parser for "which post is this URL": the command's input and the browser tabs it may
 * read both go through it, so a tab is only ever read when it is exactly the requested post.
 * Accepts `/p/<code>`, `/reel/<code>`, `/reels/<code>`, and each of those after a username.
 */
export function parseInstagramPostUrl(raw: string): InstagramPostRef | null {
  const url = parseInstagramUrl(raw);
  if (!url) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  // `/<kind>/<code>` or `/<user>/<kind>/<code>`; anything longer is some other page.
  const [kindSegment, shortcode] = segments.length === 2 ? segments : segments.length === 3 ? segments.slice(1) : [];
  const kind = kindSegment ? KIND_BY_SEGMENT.get(kindSegment) : undefined;

  if (!kind || !shortcode || !SHORTCODE.test(shortcode)) return null;
  return { shortcode, kind };
}

/**
 * The post's link to open in the browser: no username, and none of the tracking parameters a
 * copied link carries (`utm_source`, `xtok`, `rpxt`, `igsh`).
 */
export function canonicalPostUrl({ shortcode, kind }: InstagramPostRef): string {
  return `https://www.instagram.com/${kind === "reel" ? "reel" : "p"}/${shortcode}/`;
}

export type InstagramStoryRef =
  { kind: "story"; user: string; storyId?: string } | { kind: "highlight"; highlightId: string };

const USERNAME = /^[A-Za-z0-9._]+$/;
const NUMERIC_ID = /^\d+$/;

/**
 * Story and highlight links, for the story commands and for matching their browser tabs:
 * `/stories/<user>/`, `/stories/<user>/<storyId>/` and `/stories/highlights/<highlightId>/`.
 */
export function parseInstagramStoryUrl(raw: string): InstagramStoryRef | null {
  const url = parseInstagramUrl(raw);
  if (!url) return null;

  const [root, owner, id, ...rest] = url.pathname.split("/").filter(Boolean);
  if (root !== "stories" || !owner || rest.length > 0) return null;

  if (owner === "highlights") {
    return id && NUMERIC_ID.test(id) ? { kind: "highlight", highlightId: id } : null;
  }
  if (!USERNAME.test(owner)) return null;
  if (id === undefined) return { kind: "story", user: owner };
  return NUMERIC_ID.test(id) ? { kind: "story", user: owner, storyId: id } : null;
}

/** The link to open in the browser: no tracking parameters. */
export function canonicalStoryUrl(ref: InstagramStoryRef): string {
  if (ref.kind === "highlight") return `https://www.instagram.com/stories/highlights/${ref.highlightId}/`;
  return `https://www.instagram.com/stories/${ref.user}/${ref.storyId ? `${ref.storyId}/` : ""}`;
}

export type DownloadCommand =
  "download-instagram-media" | "download-instagram-story" | "download-instagram-highlight-story";

/** Which command downloads this link, so any command can hand a link to the right one. */
export function commandForInstagramUrl(raw: string): DownloadCommand | null {
  if (parseInstagramPostUrl(raw)) return "download-instagram-media";
  const story = parseInstagramStoryUrl(raw);
  if (story?.kind === "story") return "download-instagram-story";
  if (story?.kind === "highlight") return "download-instagram-highlight-story";
  return null;
}
