import { open, showToast, Toast } from "@raycast/api";

export async function openAttachedUrls(urls: string[]) {
  let failedCount = 0;
  for (const url of urls) {
    try {
      await open(url);
    } catch (error) {
      console.error("Failed to open URL", url, error);
      failedCount++;
    }
  }

  if (failedCount > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Unable to open ${failedCount} URL${failedCount > 1 ? "s" : ""}`,
      message: `${urls.length - failedCount} of ${urls.length} URLs opened successfully`,
    });
  }
}
