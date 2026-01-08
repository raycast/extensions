import { Clipboard, getPreferenceValues, showToast, Toast, getSelectedText } from "@raycast/api";
import { Bitlink, ErrorResult } from "./types";
import { API_HEADERS, API_URL } from "./config";

export default async function () {
  const toast = await showToast(Toast.Style.Animated, "Shortening");
  try {
    const { pasteAfterShortening } = getPreferenceValues<Preferences>();

    // If no text is selected, fall back to the clipboard
    let urlToShorten;
    try {
      urlToShorten = await getSelectedText();
    } catch {
      urlToShorten = await Clipboard.readText();
    }

    if (!urlToShorten) throw new Error("No text selected and clipboard is empty");
    // Validate the URL or error out early
    new URL(urlToShorten);

    const response = await fetch(`${API_URL}/shorten`, {
      headers: API_HEADERS,
      method: "post",
      body: JSON.stringify({
        long_url: urlToShorten,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      const { message, errors } = result as ErrorResult;
      throw new Error(`Bitly API Error - ${errors ? JSON.stringify(errors) : message}, URL - ${urlToShorten}`);
    }
    const { link } = result as Bitlink;

    await Clipboard.copy(link);

    toast.style = Toast.Style.Success;
    toast.title = "Success";
    toast.message = "Copied shortened URL to clipboard";

    if (pasteAfterShortening) {
      await Clipboard.paste(link);
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error";
    toast.message = `${error}`;
  }
}
