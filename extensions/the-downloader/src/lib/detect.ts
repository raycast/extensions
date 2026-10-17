import { SourceType } from "../types.js";
import { normalizeUrl } from "./url.js";

const GALLERY_DOMAINS = [
  "reddit.com",
  "redd.it",
  "imgur.com",
  "pixiv.net",
  "deviantart.com",
  "flickr.com",
  "danbooru.donmai.us",
  "gelbooru.com",
  "artstation.com",
  "tumblr.com",
  "instagram.com",
];

/**
 * Pinterest needs its own check: it serves the same boards from regional TLDs
 * (pinterest.de, pinterest.co.uk, …) and from `pin.it` short links, none of
 * which a fixed "pinterest.com" entry would match. Match `pin.it` exactly, or
 * any host with a `pinterest` domain label (covers regional TLDs and country
 * subdomains like in.pinterest.com) — while leaving lookalikes such as
 * "notpinterest.com" alone.
 */
function isPinterest(host: string): boolean {
  return host === "pin.it" || host.split(".").includes("pinterest");
}

const SPOTIFY_DOMAINS = ["open.spotify.com"];

const VIDEO_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "twitch.tv",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "dailymotion.com",
  "bilibili.com",
  "facebook.com",
  "soundcloud.com",
  "streamable.com",
];

/** The URL's host without `www.`, with or without a scheme; "" when it can't be parsed. */
export function hostnameOf(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function matches(host: string, domains: string[]): boolean {
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * True for YouTube links. yt-dlp needs a JavaScript runtime (Deno) to read
 * YouTube's player; other sites download without one.
 */
export function needsJsRuntime(url: string): boolean {
  return matches(hostnameOf(url), ["youtube.com", "youtu.be"]);
}

/**
 * Detect which tool a URL routes to: a video/audio source (yt-dlp), an image
 * gallery (gallery-dl), a Spotify link (spotDL), or — for any other site — a
 * webpage to save with monolith. Video sites are an explicit allowlist; the
 * catch-all is "webpage", so a plain URL is archived rather than handed to
 * yt-dlp's generic extractor. An unparseable URL also falls through to "webpage".
 */
export function detectSource(url: string): SourceType {
  const host = hostnameOf(url);
  if (matches(host, SPOTIFY_DOMAINS)) return "spotify";
  if (isPinterest(host)) return "gallery";
  if (matches(host, GALLERY_DOMAINS)) return "gallery";
  if (matches(host, VIDEO_DOMAINS)) return "video";
  return "webpage";
}
