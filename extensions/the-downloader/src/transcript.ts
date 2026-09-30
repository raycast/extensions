import fs from "node:fs";
import os from "node:os";
import path from "path";
import crypto from "node:crypto";
import { environment } from "@raycast/api";
import { forceIpv4, getDenoPath, getffmpegPath, getIdleTimeoutMs, getytdlPath, sanitizeVideoTitle } from "./utils.js";
import { fetchVideoInfo, isLiveStream } from "./lib/ytdlp.js";
import { runWithWatchdog } from "./lib/run.js";
import SRTParser from "srt-parser-2";
import { Video } from "./types.js";

/**
 * Pick a scratch directory for the subtitle download. Prefer Raycast's support
 * path (writable on every install, survives the session) and fall back to the
 * OS temp dir if support is unavailable (e.g. invoked outside a Raycast
 * environment in tests). NOT the user's downloadPath — that may be read-only,
 * a slow network mount, or shared across concurrent transcript extractions.
 */
function transcriptScratchRoot(): string {
  try {
    if (environment.supportPath) return environment.supportPath;
  } catch {
    /* `environment` isn't bound (e.g. in tests) — fall through */
  }
  return os.tmpdir();
}

/** No usable captions. Carries the metadata fetched on the way, so callers can still show what they know. */
export class NoTranscriptError extends Error {
  constructor(
    message: string,
    readonly video: Video,
  ) {
    super(message);
    this.name = "NoTranscriptError";
  }
}

function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Why there's no transcript, in plain words: no captions at all, none in the
 * chosen language, YouTube rate-limiting caption downloads, or yt-dlp's own error.
 */
export function noCaptionsMessage(o: {
  requested: string;
  languages: string[];
  listed: boolean;
  error?: string;
}): string {
  if (o.error && /\b429\b|too many requests/i.test(o.error)) {
    return "YouTube is limiting caption downloads right now. Reload in a few minutes.";
  }
  if (o.error) return `Couldn't get the captions: ${o.error}`;
  if (o.requested === "auto" || !o.listed) return "This video has no captions.";
  return `This video has no ${languageName(o.requested)} captions. Set Transcript Language to Automatic in preferences to use the language it has.`;
}

/** Languages to try, most wanted first. `auto` means the video's own language, then English. */
export function subtitleLanguages(requested: string, videoLanguage?: string | null): string[] {
  const wanted = requested === "auto" ? [videoLanguage ?? "", "en"] : [requested];
  return [...new Set(wanted.map((l) => l.trim()).filter(Boolean))];
}

/**
 * The `--sub-langs` value. yt-dlp matches sub langs by an anchored regex, so a
 * bare `en` misses en-US / en-GB / en-orig; the `<lang>.*` form catches them,
 * and listing the exact form first keeps priority obvious.
 */
export function subLangsArg(languages: string[]): string {
  return languages.flatMap((l) => [l, `${l}.*`]).join(",");
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The subtitle file for the most wanted language: `<id>.<lang>.srt` first, then a variant such as `<id>.<lang>-US.srt`. */
export function pickSubtitleFile(files: string[], languages: string[]): string | undefined {
  const srt = files.filter((f) => f.endsWith(".srt"));
  for (const lang of languages) {
    const exact = srt.find((f) => f.endsWith(`.${lang}.srt`));
    if (exact) return exact;
    const variant = srt.find((f) => new RegExp(`\\.${escapeRegExp(lang)}[-_][^.]*\\.srt$`).test(f));
    if (variant) return variant;
  }
  return srt[0];
}

/**
 * The one caption track to fetch, from the tracks the metadata lists: uploaded
 * captions in the most wanted language (or a regional variant such as en-US),
 * then the site's transcription of the spoken language (YouTube's `<lang>-orig`),
 * then any automatic track in that language. Asking for one track instead of a
 * pattern keeps YouTube from rate-limiting the extra caption requests. With
 * `anyLanguage`, a video with none of those falls back to whatever it has.
 */
export function pickSubtitleTrack(
  video: Video,
  languages: string[],
  { anyLanguage = false }: { anyLanguage?: boolean } = {},
): string | undefined {
  const uploaded = Object.keys(video.subtitles ?? {}).filter((l) => l !== "live_chat");
  const automatic = Object.keys(video.automatic_captions ?? {});
  for (const lang of languages) {
    const track =
      uploaded.find((l) => l === lang) ??
      uploaded.find((l) => l.startsWith(`${lang}-`)) ??
      automatic.find((l) => l === `${lang}-orig`) ??
      automatic.find((l) => l === lang) ??
      automatic.find((l) => l.startsWith(`${lang}-`));
    if (track) return track;
  }
  return anyLanguage ? (uploaded[0] ?? automatic.find((l) => l.endsWith("-orig"))) : undefined;
}

/** The language code in a `<id>.<lang>.srt` file name. */
function languageOf(file: string): string {
  return file.slice(0, -".srt".length).split(".").pop() ?? "";
}

/**
 * Fetch a video's metadata and the raw SRT of its best matching subtitle track
 * (uploaded or automatic). `requested` is a language code or `auto`.
 */
export async function fetchSubtitles(
  url: string,
  requested: string,
  signal?: AbortSignal,
): Promise<{ video: Video; srt: string; language: string }> {
  const ytdlPath = getytdlPath();
  const ffmpegPath = getffmpegPath();

  // Validate yt-dlp exists
  if (!fs.existsSync(ytdlPath)) {
    throw new Error("yt-dlp is not installed");
  }
  if (!fs.existsSync(ffmpegPath)) {
    throw new Error("ffmpeg is not installed");
  }

  // yt-dlp needs the Deno JS runtime for YouTube extraction; pass it to BOTH
  // the metadata fetch and the subtitle download (the form's video path does
  // the same). Without it, transcript extraction silently fails on YouTube.
  const denoPath = getDenoPath();
  const deno = fs.existsSync(denoPath) ? denoPath : undefined;

  // Metadata via the shared fetchVideoInfo: resilient JSON parsing (yt-dlp can
  // print [debug]/[warning] lines before the JSON), --no-warnings/--quiet/
  // --no-playlist, the Deno runtime, and an abortable timeout — none of which
  // the previous bare `JSON.parse(execa stdout)` had.
  const video = await fetchVideoInfo(ytdlPath, url, forceIpv4, deno, { signal, timeoutMs: getIdleTimeoutMs() });

  // Check if it's a live stream
  if (isLiveStream(video)) {
    throw new Error("Live streams are not supported");
  }

  const wanted = subtitleLanguages(requested, video.language);
  const listed = Object.keys(video.subtitles ?? {}).length + Object.keys(video.automatic_captions ?? {}).length > 0;
  // `auto` means "whatever is spoken", so any track beats none (a model can read other languages).
  const track = pickSubtitleTrack(video, wanted, { anyLanguage: requested === "auto" });
  if (listed && !track) {
    throw new NoTranscriptError(noCaptionsMessage({ requested, languages: wanted, listed }), video);
  }
  // Sites that don't list their tracks up front get the pattern instead.
  const languages = track ? [track] : wanted;

  // Per-call scratch directory under the support path. A fresh subdir per
  // invocation avoids two concurrent transcript extractions (e.g. from the
  // Download form and the extract-transcript tool at the same time) clobbering
  // each other's files and rm-ing the directory under each other's feet.
  const tmpDir = path.join(transcriptScratchRoot(), `transcript-${crypto.randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // Download subtitles using yt-dlp, through the shared watchdog (closes stdin
    // so yt-dlp can't hang on an auth prompt, idle-kills a stall, and is
    // abortable via `signal`).
    const args = [
      "--write-sub", // Write subtitle file
      "--write-auto-sub", // Write automatically generated subtitles
      "--skip-download", // Don't download the video
      "--no-playlist", // A watch?v=…&list=… URL must not fetch the whole playlist's subs
      "--sub-langs",
      track ? escapeRegExp(track) : subLangsArg(languages),
      "--convert-subs", // Convert subtitles to srt format
      "srt",
      "--ffmpeg-location",
      ffmpegPath,
      ...(deno ? ["--js-runtimes", `deno:${deno}`] : []),
      "-o", // Output template
      path.join(tmpDir, "%(id)s.%(ext)s"),
      url,
    ];
    const { code, stderr } = await runWithWatchdog(ytdlPath, args, { idleMs: getIdleTimeoutMs(), abortSignal: signal });

    // Find the downloaded subtitle file. yt-dlp can exit non-zero after saving
    // one track and failing another; a saved track is still good.
    const subtitleFile = pickSubtitleFile(fs.readdirSync(tmpDir), languages);

    if (!subtitleFile) {
      const message = stderr.trim() || "Failed to download subtitles";
      if (code !== 0 && !/subtitle/i.test(message)) throw new Error(message);
      // The metadata is already here, so a caption failure (none in this
      // language, or e.g. HTTP 429 on the caption file) keeps the video usable.
      const lastError = message
        .split("\n")
        .filter((line) => line.startsWith("ERROR:"))
        .pop()
        ?.replace(/^ERROR:\s*/, "");
      throw new NoTranscriptError(
        noCaptionsMessage({ requested, languages, listed, error: code !== 0 ? (lastError ?? message) : undefined }),
        video,
      );
    }

    return {
      video,
      srt: fs.readFileSync(path.join(tmpDir, subtitleFile), "utf-8"),
      language: languageOf(subtitleFile),
    };
  } finally {
    // Always clean up — success or error — so a partial scratch never leaks.
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export default async function extractTranscript(url: string, language: string = "en", signal?: AbortSignal) {
  const { video, srt } = await fetchSubtitles(url, language, signal);

  // Convert SRT to markdown
  const transcript = cleanUpSrt(srt);

  // A subtitle track made up entirely of music cues / bracketed sound effects
  // cleans up to an empty string. Treat that as a failure rather than writing
  // a 0-byte file under a green "Saved" toast or returning "" to the AI tool.
  if (!transcript.trim()) {
    throw new Error("No usable transcript text found for this video.");
  }

  return {
    transcript,
    title: sanitizeVideoTitle(video.title),
  };
}

/** A stretch of speech that starts `start` seconds into the video. */
export type TranscriptSegment = { start: number; text: string };

/**
 * The transcript as timestamped segments, plus the metadata fetched on the way.
 * `language` defaults to the video's own language, falling back to English.
 */
export async function fetchTranscriptSegments(url: string, language = "auto", signal?: AbortSignal) {
  const { video, srt, language: found } = await fetchSubtitles(url, language, signal);
  const segments = srtToSegments(srt);
  if (segments.length === 0) {
    throw new NoTranscriptError("This video's captions have no usable text.", video);
  }
  return { video, segments, language: found };
}

export function cleanUpSrt(srtContent: string): string {
  const parser = new SRTParser();
  const subtitles = parser.fromSrt(srtContent);

  let cleanedText = "";
  let previousText = "";

  for (const subtitle of subtitles) {
    const currentText = subtitle.text.trim();

    // Skip empty subtitles
    if (!currentText) continue;

    // Skip if this subtitle is exactly the same as the previous one
    if (currentText === previousText) continue;

    // Rolling captions: the next cue often REPEATS the previous one with a few
    // words appended. Only treat it as growth when the previous text is an
    // actual PREFIX of the current — `substring(previousText.length)` chops the
    // leading N chars, which is correct only for a prefix. Using `includes()`
    // here (a match anywhere) sliced the wrong characters and corrupted the
    // transcript on reflowed/overlapping cues.
    if (previousText !== "" && currentText.startsWith(previousText)) {
      const newPart = currentText.substring(previousText.length).trim();
      if (newPart) {
        cleanedText += " " + newPart;
      }
    }
    // If this is completely new text
    else if (!previousText.includes(currentText)) {
      if (cleanedText) cleanedText += " ";
      cleanedText += currentText;
    }

    previousText = currentText;
  }

  return cleanedText
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/\{[^}]+\}/g, "") // Remove curly brace formatting
    .replace(/\[.*?\]/g, "") // Remove square bracket content
    .replace(/\([^)]*\)/g, "") // Remove parentheses content
    .replace(/♪/g, "") // Remove music symbols
    .trim();
}

/** Caption markup and sound cues that never belong in a transcript. */
function cleanCaptionText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/\{[^}]+\}/g, "") // Remove curly brace formatting
    .replace(/\[.*?\]/g, "") // Remove square bracket content
    .replace(/\([^)]*\)/g, "") // Remove parentheses content
    .replace(/♪/g, "") // Remove music symbols
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The transcript as segments of about `windowSeconds` each, keeping when each
 * one starts. Uses the same rolling-caption handling as `cleanUpSrt`, so the
 * joined text matches the plain transcript apart from spacing.
 */
export function srtToSegments(srtContent: string, windowSeconds = 30): TranscriptSegment[] {
  const parser = new SRTParser();
  const segments: TranscriptSegment[] = [];
  let current: { start: number; parts: string[] } | undefined;
  let previousText = "";

  const flush = () => {
    if (!current) return;
    const text = current.parts.join(" ");
    if (text) segments.push({ start: current.start, text });
    current = undefined;
  };

  for (const cue of parser.fromSrt(srtContent)) {
    const currentText = cue.text.trim();
    if (!currentText || currentText === previousText) continue;

    let piece = "";
    if (previousText !== "" && currentText.startsWith(previousText)) {
      piece = currentText.substring(previousText.length).trim();
    } else if (!previousText.includes(currentText)) {
      piece = currentText;
    }
    previousText = currentText;
    // Clean per cue, so a segment starts at its first spoken line, not at a dropped "[Music]".
    const spoken = cleanCaptionText(piece);
    if (!spoken) continue;

    if (current && cue.startSeconds - current.start >= windowSeconds) flush();
    if (!current) current = { start: Math.max(0, cue.startSeconds), parts: [] };
    current.parts.push(spoken);
  }
  flush();
  return segments;
}
