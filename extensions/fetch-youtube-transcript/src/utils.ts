import { promises as fs } from "fs";
import * as fsSync from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import which from "which";
import { TranscriptResult } from "./interfaces";

// Function to extract video ID from URL
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Cache for yt-dlp path to avoid repeated filesystem checks
let cachedYtDlpPath: string | null = null;

// Helper to find yt-dlp in PATH or use env var
export function resolveYtDlpPath(): string {
  // Return cached path if available
  if (cachedYtDlpPath) {
    return cachedYtDlpPath;
  }

  // 1. Check environment variable
  if (process.env.YT_DLP_PATH && process.env.YT_DLP_PATH.trim() !== "") {
    cachedYtDlpPath = process.env.YT_DLP_PATH;
    return cachedYtDlpPath;
  }

  // 2. Try common installation paths first
  const commonPaths = [
    "/opt/homebrew/bin/yt-dlp", // Homebrew on Apple Silicon
    "/usr/local/bin/yt-dlp", // Homebrew on Intel Mac
    "/usr/bin/yt-dlp", // Linux common path
  ];

  for (const path of commonPaths) {
    if (fsSync.existsSync(path)) {
      cachedYtDlpPath = path;
      return cachedYtDlpPath;
    }
  }

  // 3. Fall back to PATH lookup
  try {
    cachedYtDlpPath = which.sync("yt-dlp");
    return cachedYtDlpPath;
  } catch {
    throw new Error(
      "yt-dlp executable not found. Please install yt-dlp and ensure it is in your PATH, or set the YT_DLP_PATH environment variable.",
    );
  }
}

// Execute command with proper error handling
export function execCommand(executable: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(executable, args, { shell: false }, (error, stdout, stderr) => {
      if (error) {
        // Always report errors, do not ignore based on warning content
        const errorMessage = `Command failed: ${error.message}\nstdout: ${stdout}\nstderr: ${stderr}`;
        reject(new Error(errorMessage));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

// Validate yt-dlp installation
export async function validateYtDlpInstallation(ytDlpPath: string): Promise<void> {
  try {
    await execCommand(ytDlpPath, ["--version"]);
  } catch {
    throw new Error(
      "yt-dlp is not installed or not found in your PATH. Please install yt-dlp and ensure it is accessible from the command line.",
    );
  }
}

// Sanitize filename to remove invalid characters
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 255);
}

// Process VTT content to extract plain text transcript
export function processVttContent(rawTranscriptContent: string): string {
  // Optimized VTT processing with single regex pass
  const lines = rawTranscriptContent.split(/\r?\n/);
  const transcriptLines: string[] = [];
  let previousLine = "";

  // Pre-compile regex patterns for better performance
  const timestampPattern = /^\d{2}:\d{2}:\d{2}\.\d{3}/;
  const htmlTagPattern = /<[^>]*>/g;
  const metadataPattern = /^Kind:\s*captions\s*Language:\s*[a-z]{2}(\s|\n)+/i;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines, numeric timestamps, and webvtt header
    if (
      trimmedLine === "" ||
      /^\d+$/.test(trimmedLine) ||
      trimmedLine.includes("WEBVTT") ||
      timestampPattern.test(trimmedLine)
    ) {
      continue;
    }

    // Clean HTML-like tags and trim
    const cleanedLine = trimmedLine.replace(htmlTagPattern, "").trim();

    // Only add the line if it's different from the previous line
    if (cleanedLine && cleanedLine !== previousLine) {
      transcriptLines.push(cleanedLine);
      previousLine = cleanedLine;
    }
  }

  // Join lines and remove metadata in one pass
  return transcriptLines
    .join(" ")
    .replace(metadataPattern, "")
    .replace(/\s*Kind:\s*captions\s*Language:\s*[a-z]{2}(\s|\n)+/gi, " ")
    .trim();
}

// Get YouTube transcript as plain text using yt-dlp
export async function getYouTubeTranscriptAsPlainText(
  videoUrl: string,
  language: string = "en",
): Promise<{ transcript: string | null; videoTitle: string | null }> {
  const ytDlpPath = resolveYtDlpPath();

  // Ensure yt-dlp is installed before proceeding
  await validateYtDlpInstallation(ytDlpPath);

  // Generate a unique temporary filename and output template
  const timestamp = Date.now();
  const baseOutputPath = path.join(os.tmpdir(), `temp_transcript_${timestamp}`);

  // The VTT file will be created with the appropriate language extension
  const tempFilePath = `${baseOutputPath}.${language}.vtt`;

  // First, get the video title using yt-dlp
  const titleArgs = ["--get-title", videoUrl];
  let videoTitle: string | null = null;

  try {
    const { stdout: titleStdout, stderr: titleStderr } = await execCommand(ytDlpPath, titleArgs);
    videoTitle = titleStdout.trim();
    if (titleStderr && titleStderr.toLowerCase().includes("fail")) {
      console.error("Failed to get video title:", titleStderr);
      // Continue without the title if we can't get it
    }
  } catch (titleError) {
    console.error("Error fetching video title:", titleError);
    // Continue without the title
  }

  // Use a specific output template to ensure yt-dlp creates the file with exactly our desired name
  const commandArgs = [
    "--write-auto-subs",
    "--skip-download",
    "--sub-lang",
    language,
    "--output",
    baseOutputPath,
    videoUrl,
  ];

  let rawTranscriptContent: string | null = null; // Initialize as null
  try {
    // 1. Execute yt-dlp to download the VTT file
    const { stdout } = await execCommand(ytDlpPath, commandArgs);

    // Also check if yt-dlp explicitly said it *couldn't* find subtitles
    if (stdout.includes("No captions found") || stdout.includes("no subtitles")) {
      return { transcript: null, videoTitle }; // Return null transcript but include title if available
    }

    // 2. Read the downloaded VTT file
    try {
      rawTranscriptContent = await fs.readFile(tempFilePath, {
        encoding: "utf8",
      });
    } catch (fileReadError: unknown) {
      const errorMessage = fileReadError instanceof Error ? fileReadError.message : String(fileReadError);
      // We don't need to log the temporary file path
      throw new Error(`Failed to read transcript file: ${errorMessage}`); // Re-throw as a clear error
    }

    // 3. Process the raw VTT content to get plain text
    const finalTranscript = rawTranscriptContent ? processVttContent(rawTranscriptContent) : "";

    return { transcript: finalTranscript, videoTitle };
  } catch (execOrFileError: unknown) {
    const errorMessage = execOrFileError instanceof Error ? execOrFileError.message : String(execOrFileError);
    console.error(`An error occurred during transcript retrieval: ${errorMessage}`);
    throw new Error(`Transcript retrieval failed: ${errorMessage}`);
  } finally {
    // This block always runs, whether there's an error or not
    // 4. Clean up: Delete the temporary VTT file if it exists
    try {
      await fs.unlink(tempFilePath);
    } catch {
      // Ignore if file didn't exist or couldn't be deleted
    }
  }
}

// Function to fetch video transcript
export async function getVideoTranscript(videoId: string, language: string = "en"): Promise<TranscriptResult> {
  // Construct full YouTube URL from video ID
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Use yt-dlp to get the transcript
  const { transcript, videoTitle } = await getYouTubeTranscriptAsPlainText(videoUrl, language);

  if (!transcript) {
    throw new Error("Transcript Not Available - No captions found in any language");
  }

  return { transcript, title: videoTitle || `YouTube Video ${videoId}` };
}
