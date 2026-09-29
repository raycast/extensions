import fs from "node:fs";
import { videoInfoForAI } from "../lib/video-chat.js";
import { fetchVideoInfo, isLiveStream } from "../lib/ytdlp.js";
import { forceIpv4, getDenoPath, getIdleTimeoutMs, getytdlPath, isValidUrl } from "../utils.js";

type Input = {
  /**
   * The URL of the video (YouTube, Vimeo, or any site yt-dlp supports).
   */
  url: string;
};

/**
 * Details about a video without downloading it: title, channel, duration,
 * views, likes, comments, engagement rates, chapters, tags, description and
 * which caption languages exist.
 */
export default async function tool(input: Input) {
  if (!isValidUrl(input.url)) {
    throw new Error("Invalid URL — provide an http(s) video URL.");
  }
  const ytdlPath = getytdlPath();
  if (!fs.existsSync(ytdlPath)) {
    throw new Error("yt-dlp is not installed. Open The Downloader's Download command to install it.");
  }
  const denoPath = getDenoPath();
  const video = await fetchVideoInfo(ytdlPath, input.url, forceIpv4, fs.existsSync(denoPath) ? denoPath : undefined, {
    timeoutMs: getIdleTimeoutMs(),
  });
  const info = videoInfoForAI({ url: input.url, video });
  return isLiveStream(video) ? `${info}\nThis is a live or upcoming stream; its transcript can't be read yet.\n` : info;
}
