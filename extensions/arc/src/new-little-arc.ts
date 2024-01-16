import { LaunchProps, closeMainWindow, showHUD, getSelectedText } from "@raycast/api";
import { makeNewLittleArcWindow } from "./arc";
import { newLittleArcPreferences, searchArcPreferences } from "./preferences";
import { NewTabSearchConfigs, URLArguments } from "./types";
import { isURL, validateURL } from "./utils";

export const config: NewTabSearchConfigs = {
  google: {
    search: "https://www.google.com/search?q=",
  },
  duckduckgo: {
    search: "https://www.duckduckgo.com?q=",
  },
  bing: {
    search: "https://www.bing.com/search?q=",
  },
  yahoo: {
    search: "https://search.yahoo.com/search?p=",
  },
  ecosia: {
    search: "https://www.ecosia.org/search?q=",
  },
};

export default async function command(props: LaunchProps<{ arguments: URLArguments }>) {
  const { url } = props.arguments;
  const { fallbackText } = props;
  const selectedText = await getSelectedText();

  const selectedTextAsSearch = `${config[searchArcPreferences.engine].search}${encodeURIComponent(selectedText)}`;

  const newTabUrl =
    url || selectedText
      ? isURL(selectedText)
        ? selectedText
        : selectedTextAsSearch
      : fallbackText || newLittleArcPreferences.url;

  try {
    if (await validateURL(newTabUrl)) {
      // Append https:// if protocol is missing
      const openURL = !/^\S+?:\/\//i.test(newTabUrl) ? "https://" + newTabUrl : newTabUrl;

      await closeMainWindow();
      await makeNewLittleArcWindow(openURL);
    }
  } catch (e) {
    console.error(e);
    await showHUD("❌ Failed opening a new little arc window.");
  }
}
