import { execa } from "execa";
import fs from "node:fs";
import os from "node:os";
import path from "path";
import crypto from "node:crypto";
import { environment } from "@raycast/api";
import { Video } from "./types.js";
import { forceIpv4, getffmpegPath, getytdlPath, sanitizeVideoTitle } from "./utils.js";
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

export default async function extractTranscript(url: string, language: string = "en") {
  const ytdlPath = getytdlPath();
  const ffmpegPath = getffmpegPath();

  // Validate yt-dlp exists
  if (!fs.existsSync(ytdlPath)) {
    throw new Error("yt-dlp is not installed");
  }
  if (!fs.existsSync(ffmpegPath)) {
    throw new Error("ffmpeg is not installed");
  }

  // First get video info to get the title
  const videoInfo = await execa(ytdlPath, [forceIpv4 ? "--force-ipv4" : "", "--dump-json", url].filter(Boolean));

  const video = JSON.parse(videoInfo.stdout) as Video;

  // Check if it's a live stream
  if (video.live_status !== "not_live" && video.live_status !== undefined) {
    throw new Error("Live streams are not supported");
  }

  // Per-call scratch directory under the support path. A fresh subdir per
  // invocation avoids two concurrent transcript extractions (e.g. from the
  // Download form and the extract-transcript tool at the same time) clobbering
  // each other's files and rm-ing the directory under each other's feet.
  const tmpDir = path.join(transcriptScratchRoot(), `transcript-${crypto.randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // Download subtitles using yt-dlp
    const subtitleResult = await execa(ytdlPath, [
      "--write-sub", // Write subtitle file
      "--write-auto-sub", // Write automatically generated subtitles
      "--skip-download", // Don't download the video
      "--sub-lang", // Specify subtitle language
      language,
      "--convert-subs", // Convert subtitles to srt format
      "srt",
      "--ffmpeg-location",
      ffmpegPath,
      "-o", // Output template
      path.join(tmpDir, "%(id)s.%(ext)s"),
      url,
    ]);

    if (subtitleResult.failed) {
      throw new Error("Failed to download subtitles");
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

    return {
      transcript,
      title: sanitizeVideoTitle(video.title),
    };
  } finally {
    // Always clean up — success or error — so a partial scratch never leaks.
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function cleanUpSrt(srtContent: string): string {
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

    // If current text contains the previous text, just add the new part
    if (currentText.includes(previousText) && previousText !== "") {
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
