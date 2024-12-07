// This script fetches and saves the transcript of a YouTube video.
// It provides a Raycast command interface for users to input a YouTube video ID,
// retrieves the video's transcript, processes it, and saves it to a local file.
// The script uses the YouTube Data API and handles user preferences for download locations.

import { showToast, Toast, getPreferenceValues, open } from "@raycast/api";
import ytdl from "ytdl-core";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

// Define an interface for the transcript result
interface TranscriptResult {
  transcript: string;
  title: string;
}

// Fetches the transcript for a given YouTube video ID
async function getVideoTranscript(videoId: string): Promise<TranscriptResult> {
  try {
    const fetch = (await import("node-fetch")).default;
    const videoInfo = await ytdl.getInfo(videoId);

    // Extract video title
    const videoTitle = videoInfo.videoDetails.title;

    if (videoInfo.player_response.captions && videoInfo.player_response.captions.playerCaptionsTracklistRenderer) {
      const captions = videoInfo.player_response.captions.playerCaptionsTracklistRenderer.captionTracks;
      if (captions && captions.length) {
        const transcriptUrl = captions[0].baseUrl;
        const transcriptResponse = await fetch(transcriptUrl);
        const transcriptText = await transcriptResponse.text();

        // Add debug logging
        console.log("Raw transcript:", transcriptText);
        const processed = processTranscript(transcriptText);
        console.log("Processed transcript:", processed);

        return {
          transcript: processed,
          title: videoTitle,
        };
      }
    }
    throw new Error("No captions available for this video.");
  } catch (error) {
    console.error("Error getting transcript:", error);
    throw error;
  }
}

// Cleans up raw transcript text
function processTranscript(transcriptText: string): string {
  // Remove XML tags
  const textOnly = transcriptText.replace(/<[^>]+>/g, " "); // Replace tags with space instead of empty string

  // Decode HTML entities
  const decodedText = textOnly
    .replace(/&amp;#39;/g, "'")
    .replace(/&amp;quot;/g, '"')
    .replace(/&amp;/g, "&");

  // Split into segments and process each line
  const segments = decodedText
    .split("\n")
    .filter((segment) => segment.trim() !== "")
    .map((segment) => {
      // Ensure proper word spacing within each segment
      return segment
        .replace(/\s+/g, " ") // Normalize spaces
        .trim(); // Remove leading/trailing spaces
    });

  // Join segments with double newlines and ensure proper word spacing
  return segments.reduce((acc, current, index) => {
    // Add space at the end of each line except the last one
    if (index === segments.length - 1) {
      return acc + current;
    }
    // Add a period and double newline between segments
    return acc + current + ".\n\n";
  }, "");
}

// Sanitize filename to remove invalid characters
function sanitizeFilename(filename: string): string {
  // Remove or replace characters that are not allowed in filenames
  return filename
    .replace(/[/\\?%*:|"<>]/g, "-") // Replace invalid characters with hyphen
    .replace(/\s+/g, " ") // Replace multiple whitespaces with single space
    .trim() // Remove leading/trailing whitespace
    .substring(0, 255); // Limit filename length
}

// Main function for the command
export default async function Command(props: { arguments: { videoUrl: string } }) {
  const { videoUrl } = props.arguments;

  if (!videoUrl) {
    await showToast({ style: Toast.Style.Failure, title: "YouTube URL is required" });
    return;
  }

  try {
    const videoIdMatch = videoUrl.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)|(?:v=)([a-zA-Z0-9_-]+)/);
    const videoId = videoIdMatch?.[1] || videoIdMatch?.[2];

    if (!videoId) {
      throw new Error("Invalid YouTube URL. Please provide a valid URL.");
    }

    await showToast({ style: Toast.Style.Animated, title: "Fetching transcript..." });

    // Get both transcript and title
    const { transcript, title } = await getVideoTranscript(videoId);

    const { defaultDownloadFolder } = getPreferenceValues<ExtensionPreferences>();
    const downloadsFolder = defaultDownloadFolder || path.join(os.homedir(), "Downloads");

    // Use sanitized video title for filename
    const filename = path.join(downloadsFolder, `${sanitizeFilename(title)}_transcript.txt`);

    await fs.writeFile(filename, transcript);

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
      message: String(error),
    });
  }
}
