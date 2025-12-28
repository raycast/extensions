import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export const WAYBACK_BASE_URL = "https://web.archive.org";
export const WAYBACK_API_URL = "https://archive.org/wayback/available";

export const urlRegex =
  /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;

export async function savePage(webpageUrl: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to Wayback Machine" });

  try {
    const res = await fetch(`${WAYBACK_BASE_URL}/save/${webpageUrl}`);

    if (res.status >= 400) {
      await showFailureToast("Failed to save to Wayback Machine");
      return;
    }

    toast.style = Toast.Style.Success;
    toast.title = "Saved to Wayback Machine";
  } catch (err) {
    await showFailureToast(err, { title: "Failed to save to Wayback Machine" });
  }
}

export function urlsToArray(urlString: string) {
  let urls = urlString.split("\n");

  // remove empty lines
  urls = urls.filter((url) => url !== "");
  // validate each url by urlRegex and remove invalid urls
  urls = urls.filter((url) => urlRegex.test(url));

  return urls;
}
