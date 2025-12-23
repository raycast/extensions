import { LaunchProps, Toast, showToast, getPreferenceValues } from "@raycast/api";
import { getInstagramStoryURL, handleDownload } from "./download-media";
import { homedir } from "os";

export default async function Command({
  arguments: { instagramUrl },
}: LaunchProps<{
  arguments: { instagramUrl: string };
}>) {
  const { mediaDownloadPath } = await getPreferenceValues();
  const downloadFolder = mediaDownloadPath || `${homedir()}/Downloads`;

  if (!instagramUrl.includes("instagram.com")) {
    await showToast({
      title: "Error",
      message: "Invalid URL provided. Please provide a valid instagram URL",
      style: Toast.Style.Failure,
    });
    return;
  }

  try {
    const parsedUrl = new URL(instagramUrl);
    const pathParts = parsedUrl.pathname.replace(/^\/+|\/+$/g, "").split("/");

    if ((pathParts.length !== 2 && pathParts.length !== 3) || pathParts[0] !== "stories") {
      await showToast({
        title: "Error",
        message: "Invalid Instagram story URL format.",
        style: Toast.Style.Failure,
      });
      return;
    } else if (instagramUrl.includes("highlights")) {
      await showToast({
        title: "Error",
        message: "Please use the highlight story command to download highlight stories.",
        style: Toast.Style.Failure,
      });
      return;
    }

    const username = pathParts[1];

    await showToast({
      title: "Fetching Story",
      style: Toast.Style.Animated,
    });

    const instagramStories = await getInstagramStoryURL(username);

    if (!instagramStories) {
      throw new Error("No story found at the provided URL");
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
      throw new Error("No story found at the provided URL");
    }

    const mediaExtension = storyUrl.includes(".jpg") ? ".jpg" : ".mp4";
    const fileId = storyUrl.includes(".jpg")
      ? storyUrl.split(".jpg")[0].split("/").pop()
      : storyUrl.split(".mp4")[0].split("/").pop();
    await handleDownload(storyUrl, fileId || "instagram-story", downloadFolder, mediaExtension);
  } catch (error) {
    await showToast({
      title: "Error",
      message: error instanceof Error ? error.message : "Unknown error occurred",
      style: Toast.Style.Failure,
    });
  }
}
