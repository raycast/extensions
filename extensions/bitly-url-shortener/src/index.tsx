import { Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
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
    const { accessToken } = getPreferenceValues();
    const clipboard = await Clipboard.readText();
    if (!clipboard) {
      return await reportError(new Error("Clipboard is empty"));
    }

    //validate url or error out early.
    new URL(clipboard);

    const response = await fetch("https://api-ssl.bitly.com/v4/shorten", {
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      }),
      method: "post",
      body: JSON.stringify({
        long_url: clipboard,
      }),
    });

    const { errors, link } = (await response.json()) as { link: string; errors?: [] };
    if (errors) {
      return await reportError(new Error("Invalid URL String"));
    }

    await Clipboard.copy(link);
    await showToast(Toast.Style.Success, "Success", "Copied shortened URL to clipboard");
  } catch (error: unknown) {
    await reportError({ message: getErrorMessage(error) });
  }
}
