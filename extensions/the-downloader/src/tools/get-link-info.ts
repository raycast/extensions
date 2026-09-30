import fs from "node:fs";
import { linkInfoForAI } from "../lib/link-chat.js";
import { linkKindOf, loadLinkContext } from "../lib/link-loader.js";
import { videoToLink } from "../lib/sources/video.js";
import { isValidUrl, normalizeUrl } from "../lib/url.js";
import { fetchVideoInfo, isLiveStream } from "../lib/ytdlp.js";
import { forceIpv4, getDenoPath, getIdleTimeoutMs, getytdlPath } from "../utils.js";

type Input = {
  /**
   * The link: a video (YouTube, TikTok, X, Vimeo…), a social post (Instagram, Reddit, Pinterest…) or any web page or article.
   */
  url: string;
};

/**
 * Details and statistics about a link without its text: title, author or
 * channel, site, date, views, likes, comments, engagement rates, chapters,
 * tags and description — and for videos, which caption languages exist.
 */
export default async function tool(input: Input) {
  // The interactive commands gate URLs through isValidUrl; this model-driven
  // entry point must too (defense in depth against a prompt-injected value).
  const raw = input.url?.trim() ?? "";
  if (!raw || !isValidUrl(raw)) throw new Error("Invalid URL — provide an http(s) link.");
  const url = normalizeUrl(raw);
  if (linkKindOf(url) !== "video") return linkInfoForAI(await loadLinkContext(url, { archiveFallback: true }));

  // Videos: metadata only — no need to wait for the captions.
  const ytdlPath = getytdlPath();
  if (!fs.existsSync(ytdlPath)) {
    throw new Error("yt-dlp is not installed. Open The Downloader's Download command to install it.");
  }
  const denoPath = getDenoPath();
  const video = await fetchVideoInfo(ytdlPath, url, forceIpv4, fs.existsSync(denoPath) ? denoPath : undefined, {
    timeoutMs: getIdleTimeoutMs(),
  });
  const info = linkInfoForAI(videoToLink(url, video, { segments: [] }));
  return isLiveStream(video) ? `${info}\nThis is a live or upcoming stream; its transcript can't be read yet.\n` : info;
}
