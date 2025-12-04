import { closeMainWindow, LaunchProps, showToast, Toast } from "@raycast/api";
import { makeNewWindow } from "./arc";
import { NewTabSearchConfigs, URLArguments } from "./types";
import { isURL, validateURL } from "./utils";
import { NewIncognitoWindowPreferences } from "./preferences";

export const config: NewTabSearchConfigs = {
  google: "https://www.google.com/search?q=",
  duckduckgo: "https://www.duckduckgo.com?q=",
  bing: "https://www.bing.com/search?q=",
  yahoo: "https://search.yahoo.com/search?p=",
  ecosia: "https://www.ecosia.org/search?q=",
  kagi: "https://kagi.com/search?q=",
  unduck: "https://unduck.link?q=",
};

export default async function command(props: LaunchProps<{ arguments: URLArguments }>) {
  let { url } = props.arguments;

  if (url) {
    if (!isURL(url)) {
      url = `${config[NewIncognitoWindowPreferences.engine as keyof NewTabSearchConfigs]}${encodeURIComponent(url)}`;
    }
  } else {
    url = NewIncognitoWindowPreferences.url;
  }

  try {
    if (!url) {
      // No URL given or set in preferences, so open blank incognito window.
      await closeMainWindow();
      await makeNewWindow({ incognito: true });
    } else if (await validateURL(url)) {
      // Append https:// if protocol is missing
      if (!/^\S+?:\/\//i.test(url)) {
        url = "https://" + url;
      }
      await closeMainWindow();
      await makeNewWindow({ incognito: true, url });
    }
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed opening a new incognito window",
    });
  }
}
