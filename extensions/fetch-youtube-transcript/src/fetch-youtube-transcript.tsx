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
      const fallbackFolder = path.join(os.homedir(), "Downloads");
      const sanitizedTitle = sanitizeFilename(title);

      // The transcript has already been fetched by this point, so a configured
      // folder that has since been deleted or unmounted must not be allowed to
      // discard it. Recreate the folder if we can, and fall back to Downloads
      // if we can't.
      let downloadsFolder = defaultDownloadFolder || fallbackFolder;
      let usedFallbackFolder = false;

      const writeTo = async (folder: string) => {
        await fs.mkdir(folder, { recursive: true });
        const target = path.join(folder, `${sanitizedTitle}_transcript.txt`);
        await fs.writeFile(target, transcript);
        return target;
      };

      let filename: string;
      try {
        filename = await writeTo(downloadsFolder);
      } catch (writeError) {
        if (downloadsFolder === fallbackFolder) {
          throw writeError;
        }
        downloadsFolder = fallbackFolder;
        usedFallbackFolder = true;
        filename = await writeTo(downloadsFolder);
      }

      // Show success toast with actions
      await showToast({
        style: Toast.Style.Success,
        title: usedFallbackFolder ? "Saved to Downloads instead" : "Transcript fetched and saved",
        message: usedFallbackFolder
          ? `Your configured folder was unavailable. Saved to: ${filename}`
          : `Saved to: ${filename}`,
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
