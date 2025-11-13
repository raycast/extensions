import { getPreferenceValues, showHUD, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getCurrentTabURL } from "./utils";

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

    await Clipboard.copy(finalURL);
    await showHUD("Localhost URL Copied to Clipboard");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to get localhost URL" });
  }
}
