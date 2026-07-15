import { showToast, Toast, getPreferenceValues, open, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { extractVideoId, sanitizeFilename, getVideoTranscript } from "./utils";

export default async function Command(props: { arguments: Arguments.FetchYoutubeTranscript }) {
  const { videoUrl, action } = props.arguments;
  const { defaultAction, defaultDownloadFolder, defaultLanguage } = getPreferenceValues<ExtensionPreferences>();

  if (!videoUrl) {
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

    // Get transcript with user's preferred language
    const { transcript, title } = await getVideoTranscript(videoId, defaultLanguage || "en");

    // Determine the actual action to perform
    const actualAction = action || defaultAction || "save";

    if (actualAction === "save") {
      // Get download location
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
    } else if (actualAction === "copy") {
      await Clipboard.copy(transcript);
      await showToast({
        style: Toast.Style.Success,
        title: "Transcript copied to clipboard",
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const title = errorMessage.includes("yt-dlp") ? "yt-dlp not found" : "Failed to fetch transcript";
    await showFailureToast(error, { title });
  }
}
