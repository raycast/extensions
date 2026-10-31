import { access, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  audioChoices,
  commonArgs,
  downloadArgs,
  MediaInfo,
  parseEvent,
  validateUrl,
  videoChoices,
  playlistSelection,
  type DownloadEvent,
  type DownloadOptions,
} from "./media";
import { run } from "./process";
import type { Tools } from "./tools";

export interface Settings {
  destination?: string;
}
export function executables(settings: Settings) {
  return {
    destination: settings.destination || join(homedir(), "Downloads"),
  };
}

export async function inspect(
  url: string,
  tools: Tools,
  signal: AbortSignal,
  playlistItem?: number,
): Promise<MediaInfo> {
  const { ytdlp } = tools;
  const raw = await run(
    ytdlp,
    [
      ...commonArgs.filter((arg) => !playlistItem || arg !== "--no-playlist"),
      ...playlistSelection(playlistItem),
      "--skip-download",
      "--dump-single-json",
      "--",
      validateUrl(url),
    ],
    { signal, timeout: 120000 },
  );
  const result = JSON.parse(raw) as MediaInfo;
  const info = playlistItem && result.entries ? result.entries[0] : result;
  if (!info) throw new Error("The selected playlist item is unavailable.");
  if (info._type === "playlist" || info._type === "multi_video")
    throw new Error(
      "Use the batch view for playlists and posts with multiple videos.",
    );
  if (info.is_live) throw new Error("Live streams are not supported.");
  if (
    !Array.isArray(info.formats) ||
    (!videoChoices(info.formats).length && !audioChoices(info.formats).length)
  )
    throw new Error("No tracks available. Check whether the link is public.");
  return info;
}

export async function download(
  options: DownloadOptions,
  tools: Tools,
  signal: AbortSignal,
  onEvent: (event: DownloadEvent) => void,
): Promise<string> {
  await mkdir(options.destination, { recursive: true });
  let file: string | undefined;
  await run(tools.ytdlp, downloadArgs({ ...options, ffmpeg: tools.ffmpeg }), {
    signal,
    onLine: (line) => {
      const event = parseEvent(line);
      if (event?.type === "file") file = event.path;
      if (event) onEvent(event);
    },
  });
  if (!file) throw new Error("The download did not report an output file.");
  await access(file);
  if (!(await stat(file)).isFile())
    throw new Error("The output file was not found.");
  return file;
}
