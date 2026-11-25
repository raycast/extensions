import { closeMainWindow, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { makeNewWindow } from "./cra";
import { NewTabSearchConfigs } from "./types";
import { isURL, normalizeURL } from "./utils";
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

export default async function command(props: LaunchProps<{ arguments: Arguments.NewIncognitoWindow }>) {
  let { url } = props.arguments;

  if (url) {
    if (!isURL(url)) {
      url = `${config[NewIncognitoWindowPreferences.engine as keyof NewTabSearchConfigs]}${encodeURIComponent(url)}`;
    }
  } else {
    url = NewIncognitoWindowPreferences.url;
  }

  try {
    // No URL given or set in preferences, so open a blank incognito window.
    const openURL = url ? normalizeURL(url) : undefined;
    await closeMainWindow();
    await makeNewWindow({ incognito: true, url: openURL });
  } catch (error) {
    await showFailureToast(error, { title: "Failed opening a new incognito window" });
  }
}
