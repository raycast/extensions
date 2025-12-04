import { LaunchProps, Toast, showToast, getPreferenceValues } from "@raycast/api";
import { getThreadsMediaURL, handleDownload } from "./lib/download-media";
import { homedir } from "os";

export default async function Command({
  arguments: { threadsUrl },
}: LaunchProps<{
  arguments: { threadsUrl: string };
}>) {
  const { mediaDownloadPath } = await getPreferenceValues();
  const downloadFolder = mediaDownloadPath || `${homedir()}/Downloads`;

  if (!threadsUrl) {
    await showToast({
      title: "Missing URL",
      message: "Please provide a Threads post URL",
      style: Toast.Style.Failure,
    });
    return;
  }

  const threadsUrlPattern = /(?:threads\.net|threads\.com)\/@[\w.]+\/post\/([A-Za-z0-9_-]+)/;
  const match = threadsUrl.match(threadsUrlPattern);

  if (!match || !match[1]) {
    await showToast({
      title: "Invalid Threads URL",
      message: "Please provide a valid Threads post URL (e.g., threads.com/@username/post/ABC123)",
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
    if (!threadMedias || (threadMedias?.images.length === 0 && threadMedias?.videos.length === 0)) {
      throw new Error("No images or videos found in this Threads post");
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
        throw new Error(`Failed to extract filename from ${media.type} URL. The media format may not be supported.`);
      }

      await handleDownload(media.url, fileId, downloadFolder, media.extension);
    }
  } catch (error) {
    await showToast({
      title: "Download Failed",
      message: error instanceof Error ? error.message : "An unexpected error occurred while downloading media",
      style: Toast.Style.Failure,
    });
  }
}
