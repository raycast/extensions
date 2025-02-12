import { getSelectedText, Clipboard, showToast, Toast, showHUD, getPreferenceValues, LaunchProps } from "@raycast/api";
import fetch from "node-fetch";

export default async function Command(props) {
  const preferences = getPreferenceValues();
  try {
    const { url } = props.arguments;
    const regexURL = /^((ftp|smtp|file|data):\/\/)?[^\s$.?#].[^\s]*$/;

    if (!regexURL.test(url)) {
      await showToast({
        title: "Selected text isn't a URL.",
        style: Toast.Style.Failure,
        message: "Selected text isn't a URL.",
      });
    } else {
      showToast({
        style: Toast.Style.Animated,
        title: "Shortening URL",
      });

      let URLString = "";

      if (["1", "2", "3"].includes(preferences.domain)) {
        const request = await fetch(`https://api.shrtco.de/v2/shorten?url=${encodeURIComponent(url)}`);
        const response = await request.json();

        if (preferences.domain == "1") {
          URLString = response.result.full_short_link;
        } else if (preferences.domain == "2") {
          URLString = response.result.full_short_link2;
        } else if (preferences.domain == "3") {
          URLString = response.result.full_short_link3;
        }
      } else {
        const getURLString = async (url) => {
          const response = await fetch(`https://tinyurl.com/api-create.php?url=${url}`);
          return response.text();
        };

        URLString = await getURLString(url);
        if (URLString.includes("Error")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Cannot transform text",
          });
          return;
        }
      }

      await Clipboard.copy(URLString);
      await showHUD("Copied URL to Clipboard");
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Can't get selected text",
    });
  }
}
