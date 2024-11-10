// This script fetches and saves the transcript of a YouTube video.
// It provides a Raycast command interface for users to input a YouTube video ID,
// retrieves the video's transcript, processes it, and saves it to a local file.
// The script uses the YouTube Data API and handles user preferences for download locations.

import React from "react";
import { showToast, Toast, getPreferenceValues, Form, ActionPanel, Action, Icon } from "@raycast/api";
import ytdl from "ytdl-core";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

// Defines the structure for user preferences, including the default download folder

interface Preferences {
  defaultDownloadFolder: string;
}

// Fetches the transcript for a given YouTube video ID
// Uses ytdl-core to get video info and extract caption tracks
// Returns the processed transcript as a string, or throws an error if no captions are available

async function getVideoTranscript(videoId: string): Promise<string> {
  try {
    // Dynamically import node-fetch to avoid ESM compatibility issues

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

// Processes the raw transcript text by removing HTML tags, decoding HTML entities,
// and joining the lines into a single string. This function cleans up the transcript
// to make it more readable and consistent.

function processTranscript(transcriptText: string): string {
  // Remove all HTML tags using a regular expression
  // This regex matches any character sequence starting with '<', ending with '>', and containing any characters in between

  const textOnly = transcriptText.replace(/<[^>]+>/g, "");
  const decodedText = textOnly
    .replace(/&amp;#39;/g, "'")
    .replace(/&amp;quot;/g, '"')
    .replace(/&amp;/g, "&");
  const lines = decodedText.split("\n").filter((line) => line.trim() !== "");
  return lines.join(" ");
}

// The Command component is the main UI for the Raycast extension.
// It renders a form with a text field for the user to enter a YouTube video ID,
// and handles the submission of this form to fetch and save the transcript.
// This component uses Raycast's Form and Action components to create the interface,
// and manages the process of fetching the transcript, saving it, and showing
// feedback to the user through toast notifications.

export default function Command() {
  // Handles the form submission when a user enters a YouTube video ID.
  // This function validates the input, fetches the transcript, saves it to a file,
  // and provides user feedback through toast notifications.
  // It uses the getVideoTranscript function to retrieve the transcript and
  // saves the file in the user's preferred download folder or the default Downloads folder.

  async function handleSubmit(values: { videoId: string }) {
    const { videoId } = values;

    if (!videoId) {
      await showToast({ style: Toast.Style.Failure, title: "Please provide a YouTube video ID" });
      return;
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: "Fetching transcript..." });
      const transcript = await getVideoTranscript(videoId);

      // Retrieve user preferences for the default download folder
      // If not set, use the system's default Downloads folder

      const { defaultDownloadFolder } = getPreferenceValues<Preferences>();
      const downloadsFolder = defaultDownloadFolder || path.join(os.homedir(), "Downloads");
      const filename = path.join(downloadsFolder, `${videoId}_transcript.txt`);

      await fs.writeFile(filename, transcript);

      await showToast({ style: Toast.Style.Success, title: "Transcript fetched and saved", message: filename });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Error fetching transcript", message: String(error) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Fetch Transcript" onSubmit={handleSubmit} icon={Icon.Document} />
        </ActionPanel>
      }
    >
      <Form.TextField id="videoId" title="YouTube Video ID" placeholder="Enter YouTube Video ID" />
    </Form>
  );
}
