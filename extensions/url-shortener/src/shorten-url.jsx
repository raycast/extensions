import { getSelectedText, Clipboard, showToast, Toast, showHUD, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

export default async function Command() {
  const preferences = getPreferenceValues();
  try {
    const url = await getSelectedText();
    const regexURL = /^((ftp|smtp|file|data):\/\/)?[^\s$.?#].[^\s]*$/;

    if (url === "") {
      await showHUD("No text selected.");
    } else if (!regexURL.test(url)) {
      await showHUD("Selected text isn't a URL.");
    } else {
      showToast({
        style: Toast.Style.Animated,
        title: "Shortening URL",
      });
      const request = await fetch(`https://api.shrtco.de/v2/shorten?url=${encodeURIComponent(url)}`);
      //response has type unknown fix this
      const response = await request.json();
      console.log(url);
      console.log(preferences.domain);
      if (preferences.domain == "1") {
        await Clipboard.paste(response.result.full_short_link);
      } else if (preferences.domain == "2") {
        await Clipboard.paste(response.result.full_short_link2);
      } else {
        await Clipboard.paste(response.result.full_short_link3);
      }
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot transform text",
      message: String(error),
    });
  }
}
