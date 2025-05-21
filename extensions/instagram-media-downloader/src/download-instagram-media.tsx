import { LaunchProps, Toast, showToast, getPreferenceValues } from "@raycast/api";
import { getInstagramMediaURL, handleDownload } from "./download-media";
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
    await showToast({
      title: "Fetching Media",
      style: Toast.Style.Animated,
    });

    const instagramMedias = await getInstagramMediaURL(instagramUrl);
    if (!instagramMedias) {
      throw new Error("No medias found at the provided URL");
    }

    for (const media of instagramMedias) {
      const mediaExtension = media.includes(".jpg") ? ".jpg" : ".mp4";
      const fileId = media.includes(".jpg")
        ? media.split(".jpg")[0].split("/").pop()
        : media.split(".mp4")[0].split("/").pop();
      await handleDownload(media, fileId, downloadFolder, mediaExtension);
    }
  } catch (error) {
    await showToast({
      title: "Error",
      message: error instanceof Error ? error.message : "Unknown error occurred",
      style: Toast.Style.Failure,
    });
  }
}
