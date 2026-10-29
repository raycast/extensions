import { getPreferenceValues, LaunchProps, showToast, Toast } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { homedir } from "os";
import { downloadMediaSet, getInstagramMediaURL, runExclusive, showErrorToast } from "./download-media";
import { mediaBasename } from "./media-files";

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

    if (pathParts.length < 2 || !["p", "reel", "reels"].includes(pathParts[0])) {
      await showErrorToast("Error", "Invalid Instagram post or reel URL format.");
      return;
    }

    const shortcode = pathParts[1];
    const mediaType = pathParts[0] === "p" ? "post" : "reel";

    // A relaunch while a carousel is still downloading would write a second copy of every file.
    await runExclusive(() => runDownload(instagramUrl, shortcode, mediaType, downloadFolder));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    await showErrorToast("Error", message);
  }
}

async function runDownload(
  instagramUrl: string,
  shortcode: string,
  mediaType: "post" | "reel",
  downloadFolder: string,
) {
  const fetchToast = await showToast({
    title: "Fetching Media",
    style: Toast.Style.Animated,
  });

  const instagramMedias = await getInstagramMediaURL(shortcode, fetchToast, instagramUrl, mediaType);
  if (!instagramMedias) {
    // Helper already showed a failure toast.
    return;
  }

  logger.log(`[download-instagram-media] Resolved ${shortcode}`, { mediaType, items: instagramMedias.length });

  await downloadMediaSet(
    instagramMedias.map((url, index) => ({ url, name: mediaBasename(shortcode, index, instagramMedias.length) })),
    downloadFolder,
    "Media",
  );
}
