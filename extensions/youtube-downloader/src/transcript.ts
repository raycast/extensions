import { execa } from "execa";
import fs from "node:fs";
import path from "path";
import { Video } from "./types.js";
import { preferences } from "./utils.js";

export default async function extractTranscript(url: string, language?: string = "en") {
  // Validate yt-dlp exists
  if (!fs.existsSync(preferences.ytdlPath)) {
    throw new Error("yt-dlp is not installed");
  }
  if (!fs.existsSync(preferences.ffmpegPath)) {
    throw new Error("ffmpeg is not installed");
  }

  // First get video info to get the title
  const videoInfo = await execa(
    preferences.ytdlPath,
    [preferences.forceIpv4 ? "--force-ipv4" : "", "--dump-json", url].filter(Boolean),
  );

  const video = JSON.parse(videoInfo.stdout) as Video;

  // Check if it's a live stream
  if (video.live_status !== "not_live" && video.live_status !== undefined) {
    throw new Error("Live streams are not supported");
  }

  // Create a temporary directory for subtitle download
  const tmpDir = path.join(preferences.downloadPath, ".tmp-subtitles");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  try {
    // Download subtitles using yt-dlp
    const subtitleResult = await execa(preferences.ytdlPath, [
      "--write-sub", // Write subtitle file
      "--write-auto-sub", // Write automatically generated subtitles
      "--skip-download", // Don't download the video
      "--sub-lang", // Specify subtitle language
      language,
      "--convert-subs", // Convert subtitles to srt format
      "srt",
      "--ffmpeg-location",
      preferences.ffmpegPath,
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
    const markdown = convertSrtToMarkdown(subtitleContent, video.title);

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });

    return {
      transcript: markdown,
      title: video.title,
      url: url,
      language: language,
    };
  } catch (error) {
    // Clean up on error
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw error;
  }
}

function convertSrtToMarkdown(srtContent: string, videoTitle: string): string {
  // Split into subtitle blocks
  const blocks = srtContent.trim().split(/\n\n+/);

  // Start with the title
  let markdown = `# ${videoTitle}\n\n`;

  // Track timestamps for sections
  let currentMinute = -1;

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length < 3) continue;

    // Parse timestamp for section headers
    const timestamp = lines[1].split(" --> ")[0];
    const minutes = Math.floor(parseTimestamp(timestamp) / 60);

    // Add minute markers as section headers
    if (minutes !== currentMinute) {
      currentMinute = minutes;
      markdown += `\n## ${minutes}:00\n\n`;
    }

    // Get the text content (everything after timestamp line)
    const text = lines.slice(2).join(" ");

    // Clean up text
    const cleanText = text
      .replace(/<[^>]+>/g, "") // Remove HTML tags
      .replace(/\{[^}]+\}/g, "") // Remove curly brace formatting
      .replace(/\[.*?\]/g, "") // Remove square bracket content
      .replace(/\([^)]*\)/g, "") // Remove parentheses content
      .replace(/♪/g, "") // Remove music symbols
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    if (cleanText) {
      markdown += cleanText + "\n\n";
    }
  }

  return markdown.trim();
}

function parseTimestamp(timestamp: string): number {
  const [hours, minutes, seconds] = timestamp.split(":").map(Number);
  return hours * 3600 + minutes * 60 + Math.floor(seconds);
}
