import { getPreferenceValues, LaunchProps, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import { getInstagramStoryURL, handleDownload, mediaExtensionAndId, showErrorToast } from "./download-media";

export default async function Command({
  arguments: { instagramUrl },
}: LaunchProps<{
  arguments: { instagramUrl: string };
}>) {
  const { mediaDownloadPath } = await getPreferenceValues();
  const downloadFolder = mediaDownloadPath || `${homedir()}/Downloads`;

  if (!instagramUrl.includes("instagram.com")) {
    await showErrorToast("Error", "Invalid URL provided. Please provide a valid instagram URL");
    return;
  }

  try {
    const parsedUrl = new URL(instagramUrl);
    const pathParts = parsedUrl.pathname.replace(/^\/+|\/+$/g, "").split("/");

    if ((pathParts.length !== 2 && pathParts.length !== 3) || pathParts[0] !== "stories") {
      await showErrorToast("Error", "Invalid Instagram story URL format.");
      return;
    } else if (instagramUrl.includes("highlights")) {
      await showErrorToast("Error", "Please use the highlight story command to download highlight stories.");
      return;
    }

    const username = pathParts[1];

    await showToast({
      title: "Fetching Story",
      style: Toast.Style.Animated,
    });

    const instagramStories = await getInstagramStoryURL(username);

    if (instagramStories === null) {
      // Helper already showed a failure toast.
      return;
    }

    if (instagramStories.length === 0) {
      await showErrorToast("Error", "No story found at the provided URL");
      return;
    }

    let storyUrl = "";
    if (pathParts.length === 2) {
      storyUrl = instagramStories[0];
    } else {
      for (const story of instagramStories) {
        if (story.includes(pathParts[2])) {
          storyUrl = story;
          break;
        }
      }
    }

    if (!storyUrl) {
      await showErrorToast("Error", "No story found at the provided URL");
      return;
    }

    const { ext, fileId } = mediaExtensionAndId(storyUrl);
    await handleDownload(storyUrl, fileId || "instagram-story", downloadFolder, ext);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    await showErrorToast("Error", message);
  }
}
