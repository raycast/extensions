import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { generateRichLink } from "./utils/formatter";
import { fetchPageTitle, isWebUrl } from "./utils/page-title";

export default async function copyClipboardForSlack() {
  try {
    const url = (await Clipboard.readText())?.trim();
    if (!url || !isWebUrl(url)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Valid URL on Clipboard",
        message: "Copy an HTTP or HTTPS link first, then run this command.",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching Page Title" });
    let title: string;
    try {
      title = await fetchPageTitle(url).finally(() => toast.hide());
    } catch (error) {
      await Clipboard.copy(url);
      await showFailureToast(error, { title: "Couldn't Fetch Title; Copied Original URL" });
      return;
    }
    await Clipboard.copy(generateRichLink(url, title));
    await showHUD(`Copied: ${title}`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't Copy Link" });
  }
}
