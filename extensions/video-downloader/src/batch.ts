import { inspect } from "./batch-downloader.js";
import {
  audioChoices,
  commonArgs,
  hasAudio,
  validateUrl,
  videoChoices,
  type DownloadOptions,
  type MediaInfo,
} from "./media.js";
import { run } from "./process.js";
import type { Tools } from "./batch-tools.js";
import { getAudioLanguages } from "./utils.js";
import { normalizeVideoUrl } from "./utils.js";
import type { Video } from "./types.js";
import type { MediaFormat } from "./media.js";

export interface Entry {
  url: string;
  title: string;
  playlistItem?: number;
}
export const entryKey = (entry: Entry) => `${entry.url}${entry.playlistItem ? `#item-${entry.playlistItem}` : ""}`;
export interface Preset {
  mode: "video" | "audio";
  container: DownloadOptions["container"];
  height: number;
  bitrate: string;
  convert: boolean;
}

export function normalizeEntries(
  source: string,
  result: {
    _type?: string;
    title?: string;
    entries?: ({
      url?: string;
      webpage_url?: string;
      title?: string;
      id?: string;
    } | null)[];
  },
): Entry[] {
  if (!result.entries) return [{ url: normalizeVideoUrl(validateUrl(source)), title: result.title || source }];
  const found = new Map<string, Entry>();
  for (const [index, item] of result.entries.entries()) {
    if (!item) continue;
    if (result._type === "multi_video" || (!item.url && !item.webpage_url && item.id)) {
      const entry = {
        url: normalizeVideoUrl(validateUrl(source)),
        title: item.title || item.id || `Video ${index + 1}`,
        playlistItem: index + 1,
      };
      found.set(entryKey(entry), entry);
      continue;
    }
    let candidate = item.webpage_url || item.url;
    if (candidate && /^[\w-]{11}$/.test(candidate) && /(^|\.)youtube\.com$|^youtu\.be$/.test(new URL(source).hostname))
      candidate = `https://www.youtube.com/watch?v=${candidate}`;
    if (!candidate) continue;
    try {
      const url = normalizeVideoUrl(validateUrl(candidate));
      found.set(url, { url, title: item.title || item.id || url });
    } catch {
      /* Unavailable or unsupported playlist entry. */
    }
  }
  return [...found.values()];
}

export async function expand(source: string, tools: Tools, signal: AbortSignal): Promise<Entry[]> {
  const output = await run(
    tools.ytdlp,
    [
      ...commonArgs.filter((arg) => arg !== "--no-playlist"),
      "--yes-playlist",
      "--flat-playlist",
      "--playlist-end",
      "200",
      "--ignore-errors",
      "--dump-single-json",
      "--",
      normalizeVideoUrl(validateUrl(source)),
    ],
    { signal, timeout: 120000 },
  );
  const entries = normalizeEntries(source, JSON.parse(output));
  if (!entries.length) throw new Error("No public videos available at this link.");
  return entries;
}

export function selectPreset(info: MediaInfo, preset: Preset): { video: string; audio: string } {
  const audioLanguages = getAudioLanguages(info as Video);
  const originalLanguage = audioLanguages?.original;
  const originalAudio = (formats: MediaFormat[]) =>
    audioChoices(formats).filter((format) => !originalLanguage || format.language === originalLanguage);
  const standalone = originalAudio(info.formats).filter((format) => format.vcodec === "none");
  const audio = (preset.mode === "video" ? standalone : originalAudio(info.formats))[0];
  if (preset.mode === "audio") {
    if (!audio) throw new Error("This video has no available audio.");
    return { video: "", audio: audio.format_id };
  }
  let videos = videoChoices(info.formats);
  if (originalLanguage) {
    const originalVideos = videos.filter((format) => !format.language || format.language === originalLanguage);
    if (originalVideos.length) videos = originalVideos;
  }
  if (preset.height) videos = videos.filter((f) => (f.height ?? Infinity) <= preset.height);
  const video = standalone.length ? videos[0] : (videos.find(hasAudio) ?? videos[0]);
  if (!video) throw new Error("No video is available at or below the selected resolution.");
  return {
    video: video.format_id,
    audio: hasAudio(video) ? "" : audio?.format_id || "",
  };
}

export async function resolvePreset(
  url: string,
  tools: Tools,
  signal: AbortSignal,
  preset: Preset,
  playlistItem?: number,
) {
  return selectPreset(await inspect(url, tools, signal, playlistItem), preset);
}

export async function runQueue<T>(
  items: T[],
  concurrency: number,
  signal: AbortSignal,
  work: (item: T, index: number) => Promise<void>,
  failure: (error: unknown, index: number) => void,
): Promise<void> {
  let next = 0;
  async function worker() {
    while (!signal.aborted && next < items.length) {
      const index = next++;
      try {
        await work(items[index], index);
      } catch (error) {
        failure(error, index);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(items.length, Math.max(1, Math.min(3, concurrency))) }, worker));
}
