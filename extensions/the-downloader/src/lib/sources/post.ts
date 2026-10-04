import fs from "node:fs";
import { getGalleryDlPath } from "../../utils.js";
import { LinkContext, LinkFact, LinkLoadError } from "../link-context.js";
import { formatCount } from "../media-info.js";
import { runWithWatchdog } from "../run.js";

// Social posts (Instagram, Reddit, Pinterest, …): gallery-dl's metadata, read
// with `-j` so nothing is downloaded. The caption or text becomes the body;
// image URLs are kept for engines that can look at them.

const SITE_NAMES: Record<string, string> = {
  instagram: "Instagram",
  reddit: "Reddit",
  pinterest: "Pinterest",
  tumblr: "Tumblr",
  imgur: "Imgur",
  deviantart: "DeviantArt",
  flickr: "Flickr",
  artstation: "ArtStation",
  pixiv: "pixiv",
  twitter: "X",
};

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "heic"]);
const MAX_IMAGES = 20;
const COOKIES_HINT = "Set Gallery: Cookies from Browser in preferences.";

type Meta = Record<string, unknown>;

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
const num = (value: unknown): number | undefined => (typeof value === "number" ? value : undefined);

function siteName(category: string | undefined): string {
  if (!category) return "Post";
  return SITE_NAMES[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

/** gallery-dl's error record, as something the user can act on. */
function loadError(message: string, site: string): LinkLoadError {
  const text = message.replace(/^"|"$/g, "");
  if (/blocked by network security/i.test(text)) {
    return new LinkLoadError(`${site} blocks anonymous access. ${COOKIES_HINT}`, "preferences");
  }
  if (/redirect to login|login required|authentication required|log in/i.test(text)) {
    return new LinkLoadError(`${site} wants you to log in to see this post. ${COOKIES_HINT}`, "preferences");
  }
  return new LinkLoadError(`Couldn't read this post: ${text}`);
}

function author(meta: Meta): string | undefined {
  const username = str(meta.username);
  const fullname = str(meta.fullname);
  if (username) return fullname && fullname !== username ? `${fullname} (@${username})` : `@${username}`;
  const redditor = str(meta.author);
  if (redditor) return meta.category === "reddit" ? `u/${redditor}` : redditor;
  return str(meta.blog_name) ?? str((meta.user as Meta | undefined)?.name);
}

function paragraphs(text: string | undefined): string[] {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** A post's own title, or the caption's first line (short enough for a list). */
function titleOf(meta: Meta, caption: string | undefined, site: string): string {
  const own = str(meta.title);
  if (own) return own;
  const first = caption?.split("\n")[0].trim();
  if (first) return first.length > 90 ? `${first.slice(0, 89)}…` : first;
  return `Post on ${site}`;
}

/**
 * gallery-dl's `-j` output as a LinkContext. `[2, meta]` records describe the
 * post, `[3, url, meta]` its files, `[-1, { message }]` an error (e.g. a login
 * wall), which becomes a LinkLoadError saying what to change.
 */
export function parseGalleryJson(json: unknown, url: string, now = Date.now()): LinkContext {
  const records = Array.isArray(json) ? (json as unknown[][]).filter(Array.isArray) : [];
  const files = records.filter((r) => r[0] === 3 && typeof r[1] === "string");
  const meta = (records.find((r) => r[0] === 2)?.[1] ?? files[0]?.[2]) as Meta | undefined;
  const category = str(meta?.category) ?? str((records.find((r) => r[0] === -1)?.[1] as Meta)?.category);
  const site = siteName(category ?? categoryFromUrl(url));

  if (!meta) {
    const error = records.find((r) => r[0] === -1)?.[1] as Meta | undefined;
    throw error
      ? loadError(str(error.message) ?? "unknown error", site)
      : new LinkLoadError("Couldn't read this post: gallery-dl found nothing at this link.");
  }

  const caption =
    str(meta.description) ?? str(meta.selftext) ?? str(meta.content) ?? str(meta.caption) ?? str(meta.body);
  const hashtags = [...new Set(caption?.match(/#[\p{L}\p{N}_]+/gu) ?? [])];
  const images = files
    .filter(([, , fileMeta]) => {
      const m = (fileMeta ?? {}) as Meta;
      return !str(m.video_url) && IMAGE_EXTENSIONS.has(String(m.extension ?? "").toLowerCase());
    })
    .map(([, fileUrl]) => fileUrl as string)
    .slice(0, MAX_IMAGES);

  const facts: LinkFact[] = [];
  const coauthors = Array.isArray(meta.coauthors)
    ? (meta.coauthors as Meta[]).map((c) => str(c.username)).filter(Boolean)
    : [];
  if (coauthors.length) facts.push({ label: "Co-authors", value: coauthors.map((c) => `@${c}`).join(", ") });
  if (str(meta.subreddit)) facts.push({ label: "Subreddit", value: `r/${meta.subreddit}` });

  const stats: LinkFact[] = [];
  const add = (label: string, value: number | undefined) => {
    const text = formatCount(value);
    if (text) stats.push({ label, value: text });
  };
  add("Likes", num(meta.likes));
  add("Score", num(meta.score));
  add("Comments", num(meta.num_comments) ?? num(meta.comment_count));
  add("Images", num(meta.count) ?? (images.length || undefined));

  const id = str(meta.post_shortcode) ?? str(meta.shortcode) ?? str(meta.id) ?? str(meta.post_id);
  const body = paragraphs(caption);
  return {
    url,
    kind: "post",
    key: category && id ? `${category}:${id}` : url,
    site,
    title: titleOf(meta, caption, site),
    author: author(meta),
    publishedAt: /^\d{4}-\d{2}-\d{2}/.exec(str(meta.date) ?? str(meta.post_date) ?? "")?.[0],
    thumbnail: images[0],
    facts,
    stats,
    tags: hashtags.length ? hashtags : undefined,
    body: { type: "paragraphs", paragraphs: body },
    images: images.length ? images : undefined,
    note: body.length ? undefined : "This post has no caption or text, so answers come from its details.",
    noteReason: body.length ? undefined : "none",
    fetchedAt: now,
  };
}

/** For an error record that doesn't name the site: `www.reddit.com` → `reddit`. */
function categoryFromUrl(url: string): string | undefined {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return Object.keys(SITE_NAMES).find((k) => host === `${k}.com` || host.endsWith(`.${k}.com`));
  } catch {
    return undefined;
  }
}

/** gallery-dl arguments that print the post's metadata as JSON; `--` keeps the URL from being read as an option. */
export function buildPostArgs(url: string, cookiesFromBrowser?: string): string[] {
  return [
    "-j",
    "--range",
    `1-${MAX_IMAGES}`,
    ...(cookiesFromBrowser ? ["--cookies-from-browser", cookiesFromBrowser] : []),
    "--",
    url,
  ];
}

/** Read a post with gallery-dl. The URL must already be validated and normalized. */
export async function loadPostLink(
  url: string,
  options: { signal?: AbortSignal; cookiesFromBrowser?: string },
): Promise<LinkContext> {
  const binary = getGalleryDlPath();
  if (!fs.existsSync(binary)) {
    throw new Error("gallery-dl is not installed. Open The Downloader's Download command to install it.");
  }
  const { code, stdout, stderr } = await runWithWatchdog(binary, buildPostArgs(url, options.cookiesFromBrowser), {
    idleMs: 60_000,
    abortSignal: options.signal,
  });
  let json: unknown;
  try {
    json = JSON.parse(stdout);
  } catch {
    throw new Error(stderr.trim() || `gallery-dl exited with code ${code}`);
  }
  return parseGalleryJson(json, url);
}
