import fs from "node:fs";
import os from "node:os";
import path from "path";
import crypto from "node:crypto";
import { environment } from "@raycast/api";
import { forceIpv4, getDenoPath, getffmpegPath, getIdleTimeoutMs, getytdlPath, sanitizeVideoTitle } from "./utils.js";
import { fetchVideoInfo, isLiveStream } from "./lib/ytdlp.js";
import { runWithWatchdog } from "./lib/run.js";
import SRTParser from "srt-parser-2";

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

export default async function extractTranscript(url: string, language: string = "en", signal?: AbortSignal) {
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
      // Match regional / auto-caption variants: yt-dlp matches sub langs by an
      // anchored regex, so a bare `en` misses en-US / en-GB / en-orig. The
      // `<lang>.*` form catches them; the exact form keeps priority obvious.
      "--sub-langs",
      `${language},${language}.*`,
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
    if (code !== 0) {
      throw new Error(stderr.trim() || "Failed to download subtitles");
    }

    // Find the downloaded subtitle file
    const files = fs.readdirSync(tmpDir);
    const subtitleFile = files.find((f) => f.endsWith(".srt"));

    if (!subtitleFile) {
      throw new Error(`No ${language} subtitles found for this video`);
    }

    // Read and parse the subtitle file
    const subtitleContent = fs.readFileSync(path.join(tmpDir, subtitleFile), "utf-8");

    // Convert SRT to markdown
    const transcript = cleanUpSrt(subtitleContent);

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
  } finally {
    // Always clean up — success or error — so a partial scratch never leaks.
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
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
