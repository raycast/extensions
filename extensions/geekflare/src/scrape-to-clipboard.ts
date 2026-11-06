import { Clipboard, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { callGeekflare, normalizeUrl, toScrapedText } from "./geekflare";

export default async function Command(props: LaunchProps<{ arguments: Arguments.ScrapeToClipboard }>) {
  const url = normalizeUrl(props.arguments.url);
  const toast = await showToast({ style: Toast.Style.Animated, title: "Scraping page…", message: url });
  try {
    const text = toScrapedText(await callGeekflare("webscraping", { url, format: ["markdown"] }));
    if (!text) {
      toast.style = Toast.Style.Failure;
      toast.title = "No content found";
      return;
    }
    await Clipboard.copy(text);
    await showHUD("Copied page as Markdown");
  } catch (error) {
    await showFailureToast(error, { title: "Scrape failed" });
  }
}
