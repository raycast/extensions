import {
  LaunchProps,
  Toast,
  showToast,
  getPreferenceValues,
} from "@raycast/api";
import { getThreadsMediaURL, handleDownload } from "./lib/download-media";
import { homedir } from "os";

export default async function Command({
  arguments: { threadsUrl },
}: LaunchProps<{
  arguments: { threadsUrl: string };
}>) {
  const { mediaDownloadPath } = await getPreferenceValues();
  const downloadFolder = mediaDownloadPath || `${homedir()}/Downloads`;

  const threadsUrlPattern =
    /(?:threads\.net|threads\.com)\/@[\w.]+\/post\/([A-Za-z0-9_-]+)/;
  const match = threadsUrl.match(threadsUrlPattern);

  if (!match || !match[1]) {
    await showToast({
      title: "Error",
      message: "Invalid URL provided. Please provide a valid threads URL",
      style: Toast.Style.Failure,
    });
    return;
  }

  try {
    await showToast({
      title: "Fetching Media",
      style: Toast.Style.Animated,
    });

    const threadMedias = await getThreadsMediaURL(threadsUrl, match[1]);
    if (
      !threadMedias ||
      (threadMedias?.images.length === 0 && threadMedias?.videos.length === 0)
    ) {
      throw new Error("No medias found at the provided URL");
    }

    const mediaFiles = [
      ...threadMedias.images.map((image: string) => ({
        url: image,
        type: "image",
        extension: "jpg",
      })),
      ...threadMedias.videos.map((video: string) => ({
        url: video,
        type: "video",
        extension: "mp4",
      })),
    ];

    for (const media of mediaFiles) {
      const fileId = media.url.split("/").pop();
      if (!fileId) {
        throw new Error(`Unable to parse ${media.type} ID`);
      }

      await handleDownload(media.url, fileId, downloadFolder, media.extension);
    }
  } catch (error) {
    await showToast({
      title: "Error",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
      style: Toast.Style.Failure,
    });
  }
}
