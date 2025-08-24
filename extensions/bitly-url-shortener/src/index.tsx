import { Clipboard, getPreferenceValues, showToast, Toast, getSelectedText } from "@raycast/api";
import fetch, { Headers } from "node-fetch";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function reportError({ message }: { message: string }) {
  await showToast(Toast.Style.Failure, "Error", message.toString());
}

export default async function () {
  try {
    const { accessToken, pasteAfterShortening } = getPreferenceValues();

    // If no text is selected, fall back to the clipboard
    let urlToShorten;
    try {
      urlToShorten = await getSelectedText();
    } catch (error: unknown) {
      urlToShorten = await Clipboard.readText();
    }

    if (!urlToShorten) {
      return await reportError(new Error("No text selected and clipboard is empty"));
    }

    // Validate the URL or error out early
    new URL(urlToShorten);

    const response = await fetch("https://api-ssl.bitly.com/v4/shorten", {
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      }),
      method: "post",
      body: JSON.stringify({
        long_url: urlToShorten,
      }),
    });

    const { errors, link } = (await response.json()) as { link: string; errors?: [] };
    if (errors) {
      return await reportError(new Error(`Bitly API Error - ${JSON.stringify(errors)}, URL - ${urlToShorten}`));
    }

    await Clipboard.copy(link);
    await showToast(Toast.Style.Success, "Success", "Copied shortened URL to clipboard");

    if (pasteAfterShortening) {
      await Clipboard.paste(link);
    }
  } catch (error: unknown) {
    await reportError({ message: getErrorMessage(error) });
  }
}
