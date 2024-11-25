import { LaunchProps, Toast, showToast, getPreferenceValues } from "@raycast/api";
import { getThreadsVideoURL, handleDownload } from "./utils";
import { homedir } from "os";

export default async function Command({
  arguments: { threadsUrl },
}: LaunchProps<{
  arguments: { threadsUrl: string };
}>) {
  const { videoDownloadPath } = await getPreferenceValues();
  const downloadFolder = videoDownloadPath || `${homedir()}/Downloads`;

  if (!threadsUrl.includes("threads.net")) {
    await showToast({
      title: "Error",
      message: "Invalid URL provided. Please provide a valid threads URL",
      style: Toast.Style.Failure,
    });
    return;
  }

  try {
    await showToast({
      title: "Fetching Video",
      style: Toast.Style.Animated,
    });

    const threadVideos = await getThreadsVideoURL(threadsUrl);
    if (!threadVideos || threadVideos.length === 0) {
      throw new Error("No videos found at the provided URL");
    }

    for (let i = 0; i < threadVideos.length; i++) {
      const videoUrl = threadVideos[i]["download_url"];
      const videoId = videoUrl.split(".mp4")[0].split("/").pop();
      if (!videoId) {
        throw new Error("Unable to parse video ID");
      }

      await handleDownload(videoUrl, videoId, downloadFolder);
    }
  } catch (error) {
    await showToast({
      title: "Error",
      message: error instanceof Error ? error.message : "Unknown error occurred",
      style: Toast.Style.Failure,
    });
  }
}
