import { getPreferenceValues, LaunchProps, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import { getInstagramMediaURLByGraphQL, handleDownload, mediaExtensionAndId, showErrorToast } from "./download-media";

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

    const fetchToast = await showToast({
      title: "Fetching Media",
      style: Toast.Style.Animated,
    });

    const instagramMedias = await getInstagramMediaURLByGraphQL(shortcode, fetchToast, instagramUrl);
    if (!instagramMedias) {
      // Helper already showed a failure toast.
      return;
    }

    for (const media of instagramMedias) {
      const { ext, fileId } = mediaExtensionAndId(media);
      await handleDownload(media, fileId || "instagram-media", downloadFolder, ext);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    await showErrorToast("Error", message);
  }
}
