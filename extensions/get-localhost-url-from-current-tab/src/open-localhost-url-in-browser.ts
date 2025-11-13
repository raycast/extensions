import { getPreferenceValues, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getCurrentTabURL, openURL } from "./utils";

export default async function Command() {
  try {
    const preferences = getPreferenceValues();
    const currentURL = await getCurrentTabURL();

    const url = new URL(currentURL);
    const path = url.pathname;
    const query = url.searchParams.entries();

    const port = preferences.port || 3000;
    const baseURL = `http://localhost:${port}`;

    const newURL = new URL(path, baseURL);
    for (const [key, value] of query) {
      newURL.searchParams.set(key, value);
    }

    const finalURL = newURL.toString();

    await openURL(finalURL);
    await showHUD("Localhost URL Opened in Browser");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to get localhost URL" });
  }
}
