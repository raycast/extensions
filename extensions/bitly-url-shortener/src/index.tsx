import { getPreferenceValues, showHUD, copyTextToClipboard } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import fetch, { Headers } from "node-fetch";

export default async function () {
  try {
    const { accessToken } = getPreferenceValues();
    const clipboard = await runAppleScript("the clipboard");
    if (clipboard.length === 0) throw new Error("Clipboard is empty");

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
      throw new Error("Invalid URL String");
    }

    await copyTextToClipboard(link);
    await showHUD("Copied shortened URL to clipboard");
  } catch (error: any) {
    await showHUD(error.toString());
  }
}
