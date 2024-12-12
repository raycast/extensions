// This script fetches and saves the transcript of a YouTube video.
// It provides a Raycast command interface for users to input a YouTube video ID,
// retrieves the video's transcript, processes it, and saves it to a local file.
// The script uses the YouTube Data API and handles user preferences for download locations.
import { showToast, Toast, getPreferenceValues, open } from "@raycast/api";
import { getSubtitles } from "youtube-captions-scraper";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import https from "https";

// Define interfaces
interface ExtensionPreferences {
  defaultDownloadFolder: string;
}

interface TranscriptResult {
  transcript: string;
  title: string;
}

interface TranscriptItem {
  text: string;
  start: number;
  dur: number;
}

// Function to fetch URL content using https
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
        res.on("error", reject);
      })
      .on("error", reject);
  });
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

// Function to fetch video transcript
async function getVideoTranscript(videoId: string): Promise<TranscriptResult> {
  try {
    // Fetch transcript using youtube-captions-scraper
    const transcriptItems = await getSubtitles({
      videoID: videoId,
      lang: "en", // Default to English
    });

    if (!transcriptItems || transcriptItems.length === 0) {
      return {
        transcript: "No transcript available",
        title: `Video ${videoId}`,
      };
    }

    // Process transcript items into readable text
    const transcript = transcriptItems.map((item: TranscriptItem) => item.text).join("\n\n");

    // Try to fetch video title using https
    let title = `YouTube Video ${videoId}`;
    try {
      const html = await fetchUrl(`https://www.youtube.com/watch?v=${videoId}`);
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].replace(" - YouTube", "");
      }
    } catch (error) {
      console.warn("Could not fetch video title, using default");
    }

    return {
      transcript,
      title,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Detailed error:", error);
      throw new Error(`Failed to fetch transcript: ${error.message}`);
    } else {
      console.error("Unknown error:", error);
      throw new Error("Failed to fetch transcript: Unknown error occurred");
    }
  }
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
    await showToast({
      style: Toast.Style.Failure,
      title: "YouTube URL is required",
    });
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
    const filename = path.join(downloadsFolder, `${sanitizeFilename(title)}_transcript.txt`);
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
    await showToast({
      style: Toast.Style.Failure,
      title: "Error fetching transcript",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
