// This script fetches and saves the transcript of a YouTube video.
// It provides a Raycast command interface for users to input a YouTube video ID,
// retrieves the video's transcript, processes it, and saves it to a local file.
// The script uses the YouTube Data API and handles user preferences for download locations.
import { showToast, Toast, getPreferenceValues, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils"; // <-- CHANGED: Added new import
import { promises as fs } from "fs";
import * as fsSync from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import which from "which";

// Define interfaces
interface ExtensionPreferences {
  defaultDownloadFolder: string;
  defaultLanguage: string;
}

interface TranscriptResult {
  transcript: string;
  title: string;
}

// Function to extract video ID from URL
function extractVideoId(url: string): string | null {
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

// Helper to find yt-dlp in PATH or use env var
function resolveYtDlpPath(): string {
  // 1. Check environment variable
  if (process.env.YT_DLP_PATH && process.env.YT_DLP_PATH.trim() !== "") {
    return process.env.YT_DLP_PATH;
  }

  // 2. Try common installation paths first
  const commonPaths = [
    "/opt/homebrew/bin/yt-dlp", // Homebrew on Apple Silicon
    "/usr/local/bin/yt-dlp", // Homebrew on Intel Mac
    "/usr/bin/yt-dlp", // Linux common path
  ];

  for (const path of commonPaths) {
    if (fsSync.existsSync(path)) {
      return path;
    }
  }

  // 3. Fall back to PATH lookup
  try {
    return which.sync("yt-dlp");
  } catch (e) {
    throw new Error(
      "yt-dlp executable not found. Please install yt-dlp and ensure it is in your PATH, or set the YT_DLP_PATH environment variable.",
    );
  }
}

// <-- CHANGED: The global variable that was here has been removed.
// const ytDlpPath = resolveYtDlpPath();

// Remove old execCommand and execCommandSafe, and replace with a robust execFile-based implementation
function execCommand(executable: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
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

// <-- CHANGED: This function now accepts the path as an argument
async function validateYtDlpInstallation(ytDlpPath: string): Promise<void> {
  try {
    await execCommand(ytDlpPath, ["--version"]);
  } catch (error) {
    throw new Error(
      "yt-dlp is not installed or not found in your PATH. Please install yt-dlp and ensure it is accessible from the command line.",
    );
  }
}

async function getYouTubeTranscriptAsPlainText(
  videoUrl: string,
  language: string = "en",
): Promise<{ transcript: string | null; videoTitle: string | null }> {
  // <-- CHANGED: The path is now resolved safely inside this function.
  const ytDlpPath = resolveYtDlpPath();

  // Ensure yt-dlp is installed before proceeding
  await validateYtDlpInstallation(ytDlpPath); // <-- CHANGED: Pass the path to the validation function

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
    let plainTextTranscript = "";
    if (rawTranscriptContent) {
      // Split content into lines
      const lines = rawTranscriptContent.split(/\r?\n/);
      // Use an array to collect cleaned lines for better performance
      const transcriptLines: string[] = [];
      let previousLine = "";
      for (const line of lines) {
        // Skip empty lines, numeric timestamps, and webvtt header
        if (
          line.trim() === "" ||
          /^\d+$/.test(line.trim()) ||
          line.includes("WEBVTT") ||
          /^\d{2}:\d{2}:\d{2}\.\d{3}/.test(line) // Skip timestamp lines
        ) {
          continue;
        }
        // Clean HTML-like tags
        const cleanedLine = line.replace(/<[^>]*>/g, "").trim();
        // Only add the line if it's different from the previous line
        if (cleanedLine && cleanedLine !== previousLine) {
          transcriptLines.push(cleanedLine);
          previousLine = cleanedLine;
        }
      }
      plainTextTranscript = transcriptLines.join(" ");
    }

    // Remove any metadata like "Kind: captions Language: en" from the transcript
    let finalTranscript = plainTextTranscript.trim();
    // Check for metadata at the beginning and remove it
    finalTranscript = finalTranscript.replace(/^Kind:\s*captions\s*Language:\s*[a-z]{2}(\s|\n)+/i, "");
    // Also check for metadata anywhere in the text (in case it's not at the beginning)
    finalTranscript = finalTranscript.replace(/\s*Kind:\s*captions\s*Language:\s*[a-z]{2}(\s|\n)+/gi, " ");

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
    } catch (unlinkError: unknown) {
      // Ignore if file didn't exist or couldn't be deleted
    }
  }
}

// Function to fetch video transcript
async function getVideoTranscript(videoId: string): Promise<TranscriptResult> {
  const { defaultLanguage } = getPreferenceValues<ExtensionPreferences>();

  // Construct full YouTube URL from video ID
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Use yt-dlp to get the transcript
  const { transcript, videoTitle } = await getYouTubeTranscriptAsPlainText(videoUrl, defaultLanguage || "en");

  if (!transcript) {
    throw new Error("Transcript Not Available - No captions found in any language");
  }

  return { transcript, title: videoTitle || `YouTube Video ${videoId}` };
}

// Sanitize filename to remove invalid characters
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 255);
}

// Main command function
export default async function Command(props: { arguments: { videoUrl: string } }) {
  const { videoUrl } = props.arguments;

  if (!videoUrl) {
    // <-- CHANGED: Using showFailureToast for a simpler error message.
    await showFailureToast("YouTube URL is required");
    return;
  }

  try {
    // Extract video ID
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error("Invalid YouTube URL. Please provide a valid URL.");
    }

    // Show loading toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Fetching transcript...",
    });

    // Get transcript
    const { transcript, title } = await getVideoTranscript(videoId);

    // Get download location
    const { defaultDownloadFolder } = getPreferenceValues<ExtensionPreferences>();
    const downloadsFolder = defaultDownloadFolder || path.join(os.homedir(), "Downloads");

    // Create filename and save
    const sanitizedTitle = sanitizeFilename(title);
    const filename = path.join(downloadsFolder, `${sanitizedTitle}_transcript.txt`);
    await fs.writeFile(filename, transcript);

    // Show success toast with actions
    await showToast({
      style: Toast.Style.Success,
      title: "Transcript fetched and saved",
      message: `Saved to: ${filename}`,
      primaryAction: {
        title: "Open File",
        onAction: () => open(filename),
      },
      secondaryAction: {
        title: "Open Folder",
        onAction: () => open(downloadsFolder),
      },
    });
  } catch (error) {
    // <-- CHANGED: Using showFailureToast to handle the error object correctly.
    await showFailureToast(error, { title: "Error" });
  }
}
