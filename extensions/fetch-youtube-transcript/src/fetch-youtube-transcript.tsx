// This script fetches and saves the transcript of a YouTube video.
// It provides a Raycast command interface for users to input a YouTube video ID,
// retrieves the video's transcript, processes it, and saves it to a local file.
// The script uses the YouTube Data API and handles user preferences for download locations.

import { showToast, Toast, getPreferenceValues, open } from "@raycast/api";
import ytdl from "ytdl-core";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

// Fetches the transcript for a given YouTube video ID
async function getVideoTranscript(videoId: string): Promise<string> {
  try {
    const fetch = (await import("node-fetch")).default;
    const transcript = await ytdl.getInfo(videoId);

    if (transcript.player_response.captions && transcript.player_response.captions.playerCaptionsTracklistRenderer) {
      const captions = transcript.player_response.captions.playerCaptionsTracklistRenderer.captionTracks;
      if (captions && captions.length) {
        const transcriptUrl = captions[0].baseUrl;
        const transcriptResponse = await fetch(transcriptUrl);
        const transcriptText = await transcriptResponse.text();
        return processTranscript(transcriptText);
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
  const textOnly = transcriptText.replace(/<[^>]+>/g, "");
  const decodedText = textOnly
    .replace(/&amp;#39;/g, "'")
    .replace(/&amp;quot;/g, '"')
    .replace(/&amp;/g, "&");
  const lines = decodedText.split("\n").filter((line) => line.trim() !== "");
  return lines.join(" ");
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

    const transcript = await getVideoTranscript(videoId);

    const { defaultDownloadFolder } = getPreferenceValues<ExtensionPreferences>();
    const downloadsFolder = defaultDownloadFolder || path.join(os.homedir(), "Downloads");
    const filename = path.join(downloadsFolder, `${videoId}_transcript.txt`);

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
