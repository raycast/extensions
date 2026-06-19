import { Clipboard, showToast, Toast } from "@raycast/api";
import { Download } from "../types";
import { getDownloadLink } from "../api/downloads";

export const copyDownloadLink = async (apiKey: string, download: Download, fileId?: number) => {
  try {
    await showToast({ style: Toast.Style.Animated, title: "Getting download link..." });
    const link = await getDownloadLink(apiKey, download.type, download.id, fileId);
    await Clipboard.copy(link);
    await showToast({ style: Toast.Style.Success, title: "Download link copied!" });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to get download link",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
