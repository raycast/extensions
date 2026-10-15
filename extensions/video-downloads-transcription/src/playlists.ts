import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  Caption,
  ExportFormat,
  MediaFormat,
  Settings,
  captionExtension,
  captionStem,
  canceledError,
  downloadCaption,
  downloadMedia,
  inspectMedia,
  isCanceled,
  outputDirectory,
  runYtDlp,
  safeName,
  whisperLanguageName,
} from "./core";

export type PlaylistEntry = {
  id: string;
  title: string;
  url: string;
  duration?: number;
  /** A stream that is live now or hasn't started, which can't be downloaded yet. */
  live?: boolean;
};

export type Playlist = {
  id: string;
  title: string;
  url: string;
  channel?: string;
  thumbnail?: string;
  entries: PlaylistEntry[];
};

/**
 * `manual` takes only creator subtitles. `any` also takes YouTube's automatic
 * captions in the spoken language, and `translated` its automatic translations.
 */
export type CaptionChoice = "manual" | "any" | "translated";

export type PlaylistDownload = {
  playlist: { title: string; url: string };
  /** A whisper.cpp language code, such as `sr`. */
  language: string;
  captions: CaptionChoice;
  format: ExportFormat;
};

export type PlaylistMediaDownload = {
  playlist: { title: string; url: string };
  format: MediaFormat;
};

/**
 * Parses `yt-dlp --flat-playlist --dump-single-json`. Channels list their
 * Videos, Shorts and Live tabs as nested playlists; their videos are combined
 * and duplicates removed.
 */
export function parsePlaylist(data: unknown, url: string): Playlist {
  if (!data || typeof data !== "object")
    throw new Error("yt-dlp did not return playlist details.");
  const info = data as Record<string, unknown>;
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined;
  const entries = new Map<string, PlaylistEntry>();
  const collect = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      if (Array.isArray(entry.entries)) {
        collect(entry.entries);
        continue;
      }
      const id = text(entry.id);
      if (!id || !/^[\w-]{11}$/.test(id) || entries.has(id)) continue;
      entries.set(id, {
        id,
        title: text(entry.title) ?? id,
        url: `https://www.youtube.com/watch?v=${id}`,
        duration:
          typeof entry.duration === "number" ? entry.duration : undefined,
        live:
          entry.live_status === "is_live" || entry.live_status === "is_upcoming"
            ? true
            : undefined,
      });
    }
  };
  collect(info.entries);
  const thumbnails = Array.isArray(info.thumbnails)
    ? (info.thumbnails as { url?: unknown }[])
        .map((thumbnail) => text(thumbnail.url))
        .filter((value): value is string =>
          Boolean(value?.startsWith("https://")),
        )
    : [];
  const first = entries.values().next().value;
  return {
    id: text(info.id) ?? url,
    title: (text(info.title) ?? "YouTube playlist").replace(/ - Videos$/, ""),
    url,
    channel: text(info.channel) ?? text(info.uploader),
    thumbnail:
      thumbnails.at(-1) ??
      (first ? `https://i.ytimg.com/vi/${first.id}/mqdefault.jpg` : undefined),
    entries: [...entries.values()],
  };
}

export async function inspectPlaylist(
  url: string,
  settings: Settings,
  signal?: AbortSignal,
): Promise<Playlist> {
  const output = await runYtDlp(
    settings,
    ["--flat-playlist", "--dump-single-json", url],
    undefined,
    signal,
  );
  return parsePlaylist(JSON.parse(output), url);
}

/** YouTube still uses a few old language codes. */
const languageAliases: Record<string, string[]> = {
  he: ["iw"],
  id: ["in"],
  yi: ["ji"],
  jw: ["jv"],
  no: ["nb"],
  tl: ["fil"],
};

export function captionMatches(caption: Caption, language: string): boolean {
  const primary = caption.language.toLowerCase().split(/[-_]/)[0];
  return [language, ...(languageAliases[language] ?? [])].includes(primary);
}

/**
 * Whether an automatic caption is YouTube's translation. Automatic captions in
 * the spoken language end in `-orig`; when a video has one, automatic captions
 * in other languages are translations of it.
 */
export function isTranslation(caption: Caption, captions: Caption[]): boolean {
  if (caption.kind !== "automatic" || /orig/i.test(caption.language))
    return false;
  const spoken = captions.filter(
    (other) => other.kind === "automatic" && /orig/i.test(other.language),
  );
  const primary = (value: string) => value.toLowerCase().split(/[-_]/)[0];
  return (
    spoken.length > 0 &&
    !spoken.some(
      (other) => primary(other.language) === primary(caption.language),
    )
  );
}

/**
 * The caption to download in a language: creator subtitles first, then
 * automatic captions in the spoken language, then automatic translations.
 */
export function pickCaption(
  captions: Caption[],
  language: string,
  choice: CaptionChoice,
): Caption | undefined {
  return captions
    .filter(
      (caption) =>
        captionMatches(caption, language) &&
        (caption.kind === "manual" ||
          (choice === "any" && !isTranslation(caption, captions)) ||
          choice === "translated"),
    )
    .sort(
      (a, b) =>
        Number(b.kind === "manual") - Number(a.kind === "manual") ||
        Number(/orig/i.test(b.language)) - Number(/orig/i.test(a.language)) ||
        Number(isTranslation(a, captions)) -
          Number(isTranslation(b, captions)) ||
        a.language.length - b.language.length,
    )[0];
}

/** Whether a folder already has this video's caption in the language and format. */
export function alreadySaved(
  files: string[],
  entry: Pick<PlaylistEntry, "id">,
  language: string,
  format: ExportFormat,
): string | undefined {
  const extension = `.${captionExtension(format)}`;
  return files.find((file) => {
    const marker = file.indexOf(`[${entry.id}] - `);
    if (marker < 0 || !file.endsWith(extension)) return false;
    const rest = file
      .slice(marker + entry.id.length + 5, -extension.length)
      .split(" - ");
    const raw = rest.at(-1) === "RAW";
    return (
      raw === (format === "raw") &&
      captionMatches(
        { language: rest[0], kind: "manual", formats: [] },
        language,
      )
    );
  });
}

/** Whether a folder already has this video's audio or video in the format. */
export function alreadyDownloaded(
  files: string[],
  entry: Pick<PlaylistEntry, "id">,
  format: MediaFormat,
): string[] {
  return files.filter(
    (file) => file.includes(`[${entry.id}]`) && file.endsWith(`.${format}`),
  );
}

export function playlistFolderName(title: string): string {
  return safeName(title);
}

/** Lists a playlist's videos and creates the folder its downloads are saved in. */
async function playlistFolder(
  playlist: PlaylistDownload["playlist"],
  settings: Settings,
  onProgress: (message: string, percent?: number) => void,
  signal?: AbortSignal,
) {
  onProgress("Listing videos…");
  const listed = await inspectPlaylist(playlist.url, settings, signal);
  if (!listed.entries.length) throw new Error("This playlist has no videos.");
  const folder = join(
    await outputDirectory(settings),
    playlistFolderName(listed.title || playlist.title),
  );
  await mkdir(folder, { recursive: true });
  return { entries: listed.entries, folder, existing: await readdir(folder) };
}

/**
 * Downloads one caption per video into a folder named after the playlist.
 * Videos that already have a file there are skipped, so an interrupted
 * download continues where it stopped.
 */
export async function downloadPlaylistSubtitles(
  { playlist, language, captions, format }: PlaylistDownload,
  settings: Settings,
  onProgress: (message: string, percent?: number) => void,
  signal?: AbortSignal,
): Promise<{
  folder: string;
  outputs: string[];
  skipped: { title: string; reason: string }[];
}> {
  const { entries, folder, existing } = await playlistFolder(
    playlist,
    settings,
    onProgress,
    signal,
  );
  const outputs: string[] = [];
  const skipped: { title: string; reason: string }[] = [];
  const name = whisperLanguageName(language);
  /** Canceling keeps what was saved so far, for the queue to show. */
  const canceled = () =>
    Object.assign(canceledError(), { partial: { folder, outputs, skipped } });
  for (const [index, entry] of entries.entries()) {
    if (signal?.aborted) throw canceled();
    onProgress(
      `${index + 1} of ${entries.length} · ${entry.title}`,
      Math.floor((index / entries.length) * 100),
    );
    const saved = alreadySaved(existing, entry, language, format);
    if (saved) {
      outputs.push(join(folder, saved));
      continue;
    }
    try {
      const video = await inspectMedia(entry.url, settings, signal);
      const caption = pickCaption(video.captions, language, captions);
      if (!caption) {
        skipped.push({
          title: entry.title,
          reason: `No ${name} ${captions === "manual" ? "creator subtitles" : "subtitles"}`,
        });
        continue;
      }
      const path = await downloadCaption(
        video,
        caption,
        format,
        settings,
        undefined,
        signal,
        folder,
      );
      existing.push(
        `${captionStem(video, caption, format)}.${captionExtension(format)}`,
      );
      outputs.push(path);
    } catch (error) {
      if (isCanceled(error)) throw canceled();
      skipped.push({
        title: entry.title,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { folder, outputs, skipped };
}

/**
 * Downloads every video in a playlist as MP3, M4A or MP4 into a folder named
 * after the playlist. Videos that already have a file in that format there are
 * skipped, so an interrupted download continues where it stopped.
 */
export async function downloadPlaylistMedia(
  { playlist, format }: PlaylistMediaDownload,
  settings: Settings,
  onProgress: (message: string, percent?: number) => void,
  signal?: AbortSignal,
): Promise<{
  folder: string;
  outputs: string[];
  skipped: { title: string; reason: string }[];
}> {
  const { entries, folder, existing } = await playlistFolder(
    playlist,
    settings,
    onProgress,
    signal,
  );
  const outputs: string[] = [];
  const skipped: { title: string; reason: string }[] = [];
  const canceled = () =>
    Object.assign(canceledError(), { partial: { folder, outputs, skipped } });
  for (const [index, entry] of entries.entries()) {
    if (signal?.aborted) throw canceled();
    const status = `${index + 1} of ${entries.length} · ${entry.title}`;
    onProgress(status, Math.floor((index / entries.length) * 100));
    const saved = alreadyDownloaded(existing, entry, format);
    if (saved.length) {
      outputs.push(...saved.map((file) => join(folder, file)));
      continue;
    }
    if (entry.live) {
      skipped.push({
        title: entry.title,
        reason: "Live or upcoming stream, available after it ends",
      });
      continue;
    }
    try {
      const files = await downloadMedia(
        { id: entry.id, title: entry.title, url: entry.url },
        format,
        settings,
        (message) => {
          const percent = /(\d+)%/.exec(message);
          onProgress(
            status,
            Math.floor(
              ((index + (percent ? Number(percent[1]) / 100 : 0)) /
                entries.length) *
                100,
            ),
          );
        },
        signal,
        folder,
      );
      outputs.push(...files);
    } catch (error) {
      if (isCanceled(error)) throw canceled();
      skipped.push({
        title: entry.title,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { folder, outputs, skipped };
}
