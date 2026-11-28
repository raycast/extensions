import { StoredChat } from "./chat-store.js";
import { DownloadKind } from "./download-session.js";
import { HistoryEntry } from "./history.js";
import { isValidUrl } from "./url.js";

// Recent links for the `@` menu of Raycast AI Chat: what the user downloaded
// or chatted about, newest first. An item carries only a `uri`; the resource
// provider (src/read-mention.ts) reads the link when the message is sent.

/** One link the `@` menu can offer. */
export type RecentLink = {
  url: string;
  title: string;
  description: string;
  /** What it was last used for: a chat, or a download of this kind. */
  source: "chat" | DownloadKind;
  at: number;
};

/** Raycast calls a mention search without a query for its default list, and caps a fixed list at 50. */
export const MENTION_LIMIT = 50;

const URI_PREFIX = "the-downloader://link/";

/**
 * The item's `uri`. The link is base64url in the path, so nothing in it
 * (a `?`, a `#`, upper case) can be re-read or rewritten as part of the URI.
 */
export function mentionUri(url: string): string {
  return URI_PREFIX + Buffer.from(url, "utf8").toString("base64url");
}

/** The http(s) link behind a `uri` from `mentionUri`, or undefined for anything else. */
export function urlFromMentionUri(uri: string): string | undefined {
  if (typeof uri !== "string" || !uri.startsWith(URI_PREFIX)) return undefined;
  const encoded = uri.slice(URI_PREFIX.length);
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return undefined;
  const url = Buffer.from(encoded, "base64url").toString("utf8");
  return /^https?:\/\//i.test(url) && isValidUrl(url) ? url : undefined;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** One spelling per link, so a download and a chat about the same link are one item. */
function linkKey(url: string): string {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
}

function describe(parts: (string | undefined)[]): string {
  return parts.filter((p): p is string => !!p?.trim()).join(" · ");
}

const KIND_LABEL: Record<DownloadKind, string> = {
  video: "Video",
  audio: "Audio",
  gallery: "Gallery",
  spotify: "Spotify",
  website: "Webpage",
  transcript: "Transcript",
  thumbnail: "Thumbnail",
};

/**
 * Chats and finished downloads as one list, newest first, one item per link.
 * Spotify downloads are left out (their links can't be read), and so is
 * anything that isn't an http(s) link.
 */
export function recentLinks(chats: StoredChat[], history: HistoryEntry[]): RecentLink[] {
  const all: RecentLink[] = [
    ...chats.map((c): RecentLink => ({
      url: c.url,
      title: c.title.trim() || hostOf(c.url),
      description: describe(["Chat", c.channel, hostOf(c.url)]),
      source: "chat",
      at: c.updatedAt,
    })),
    ...history
      .filter((e) => e.status === "done" && e.kind !== "spotify")
      .map((e): RecentLink => ({
        url: e.url,
        title: e.title?.trim() || hostOf(e.url),
        description: describe([KIND_LABEL[e.kind], e.uploader, hostOf(e.url)]),
        source: e.kind,
        at: e.finishedAt,
      })),
  ];
  const seen = new Set<string>();
  return all
    .filter((link) => /^https?:\/\//i.test(link.url) && isValidUrl(link.url))
    .sort((a, b) => b.at - a.at)
    .filter((link) => {
      const key = linkKey(link.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** The links matching every word of `query` (in the title, the description or the link), at most `limit`. */
export function searchRecentLinks(links: RecentLink[], query: string, limit = MENTION_LIMIT): RecentLink[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (link: RecentLink) => {
    const text = `${link.title}\n${link.description}\n${link.url}`.toLowerCase();
    return words.every((w) => text.includes(w));
  };
  return (words.length ? links.filter(matches) : links).slice(0, limit);
}
