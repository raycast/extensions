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
      const response = await request.json();
      let urlString = "";

      switch (preferences.domain) {
        case "1":
        case "2":
        case "3":
          if (preferences.domain == "1") {
            await Clipboard.paste(response.result.full_short_link);
          } else if (preferences.domain == "2") {
            await Clipboard.paste(response.result.full_short_link2);
          } else if (preferences.domain == "3") {
            await Clipboard.paste(response.result.full_short_link3);
          }
          break;
        default:
          urlString = async (url) => {
            const response = await fetch(`https://tinyurl.com/api-create.php?url=${url}`);
            return response.text();
          };
          if (preferences.clipboard == "1") {
            await Clipboard.paste(await urlString(url));
          } else {
            await Clipboard.copy(await urlString(url));
            await showHUD("Copied url to clipboard");
          }
          break;
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
