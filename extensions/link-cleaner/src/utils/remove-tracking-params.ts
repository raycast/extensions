import {
  Clipboard,
  closeMainWindow,
  getFrontmostApplication,
  getPreferenceValues,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { rules } from "./rules";
import { findURLs, removeQueryParams, replaceURLs } from "./url-utils";

export default async function removeTrackingParams(rawText: string) {
  // detect urls in text
  const urls = findURLs(rawText);
  // if no url found, exit
  if (urls.length === 0) {
    await showHUD("No URL found");
    return;
  }
  console.log("raw urls", urls);

  // generate new urls without tracking parameters
  const newURLs = [];
  for (const url of urls) {
    // find allow params in rules
    const allowParams = rules.find((rule) => url.includes(rule.url))?.allowParams || [];
    console.log("allow params", allowParams);
    // remove query params
    const newURL = removeQueryParams(url, allowParams);
    newURLs.push(newURL);
  }
  console.log("new urls", newURLs);

  // replace urls with new urls in text
  const newText = replaceURLs(rawText, newURLs);
  console.log("new text", newText);

  // finishing touches
  await Clipboard.copy(newText);
  const frontmostApp = await getFrontmostApplication();

  const { exitAfterCleaning }: Preferences = getPreferenceValues();
  if (exitAfterCleaning) {
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Suspended });
  }

  await showToast({
    title: "Tracking parameters removed",
    message: newText,
    style: Toast.Style.Success,
    primaryAction: {
      title: `Paste Cleaned URL to ${frontmostApp.name}`,
      onAction: async () => {
        await Clipboard.paste(newText);
      },
    },
  });
}
