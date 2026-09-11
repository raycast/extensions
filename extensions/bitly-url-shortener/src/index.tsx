import {
  Clipboard,
  getPreferenceValues,
  showToast,
  Toast,
  getSelectedText,
  openCommandPreferences,
} from "@raycast/api";
import { Bitlink, ErrorResult } from "./types";
import { API_HEADERS, API_URL } from "./config";
import { assertBitlyOk, BitlyAuthError } from "./utils";

export default async function () {
  const toast = await showToast(Toast.Style.Animated, "Shortening");
  try {
    const { pasteAfterShortening } = getPreferenceValues<Preferences>();

    // If no text is selected, fall back to the clipboard.
    // On some platforms (e.g. Windows) getSelectedText() resolves with an empty
    // string instead of rejecting when there is no selection, so we can't rely
    // on the try/catch alone to trigger the clipboard fallback.
    let urlToShorten;
    try {
      urlToShorten = await getSelectedText();
    } catch {
      urlToShorten = undefined;
    }
    urlToShorten = urlToShorten?.trim();

    if (!urlToShorten) {
      urlToShorten = (await Clipboard.readText())?.trim();
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
    assertBitlyOk(response, result as ErrorResult, `URL - ${urlToShorten}`);
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
    toast.title = error instanceof BitlyAuthError ? "Invalid Access Token" : "Error";
    toast.message = `${error instanceof Error ? error.message : error}`;
    if (error instanceof BitlyAuthError) {
      toast.primaryAction = {
        title: "Open Command Preferences",
        onAction: () => openCommandPreferences(),
      };
    }
  }
}
