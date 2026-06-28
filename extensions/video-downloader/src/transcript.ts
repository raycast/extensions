import { execa } from "execa";
import fs from "node:fs";
import path from "path";
import { Video } from "./types.js";
import { downloadPath, getffmpegPath, getytdlPath, getCommonArgs, sanitizeVideoTitle } from "./utils.js";
import SRTParser from "srt-parser-2";

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
  const videoInfo = await execa(ytdlPath, [...getCommonArgs({ throttle: true }), "--dump-json", url]);

  const video = JSON.parse(videoInfo.stdout) as Video;

  // Check if it's a live stream
  if (video.live_status !== "not_live" && video.live_status !== undefined) {
    throw new Error("Live streams are not supported");
  }

  // Create a temporary directory for subtitle download
  const tmpDir = path.join(downloadPath, ".tmp-subtitles");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  try {
    // Download subtitles using yt-dlp
    const subtitleResult = await execa(ytdlPath, [
      ...getCommonArgs({ throttle: true }),
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

    // Find the downloaded subtitle file. yt-dlp names files `<id>.<lang>.srt`
    // (e.g. `abc.en.srt`, `abc.en-US.srt`, `abc.en-orig.srt`). Match the
    // requested language (and its regional/auto variants) so we don't return a
    // fallback-language track as if it were the requested transcript.
    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".srt"));
    const wanted = language.toLowerCase();
    const subtitleFile = files.find((f) => {
      const lang = f.slice(0, -".srt".length).split(".").pop()?.toLowerCase() ?? "";
      return lang === wanted || lang.startsWith(`${wanted}-`);
    });

    if (!subtitleFile) {
      // Surface the languages we did get, to make the failure actionable.
      const available = files
        .map((f) => f.slice(0, -".srt".length).split(".").pop())
        .filter(Boolean)
        .join(", ");
      throw new Error(
        available
          ? `No ${language} subtitles found for this video (available: ${available})`
          : `No ${language} subtitles found for this video`,
      );
    }

    // Read and parse the subtitle file
    const subtitleContent = fs.readFileSync(path.join(tmpDir, subtitleFile), "utf-8");

    // Convert SRT to markdown
    const transcript = cleanUpSrt(subtitleContent);

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });

    return {
      transcript,
      title: sanitizeVideoTitle(video.title),
    };
  } catch (error) {
    // Clean up on error
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw error;
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
