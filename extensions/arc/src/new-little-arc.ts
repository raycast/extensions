import { LaunchProps, closeMainWindow, showHUD, getSelectedText } from "@raycast/api";
import { makeNewLittleArcWindow } from "./arc";
import { newLittleArcPreferences } from "./preferences";
import { NewTabSearchConfigs, URLArguments } from "./types";
import { isURL, validateURL } from "./utils";

export const config: NewTabSearchConfigs = {
  google: "https://www.google.com/search?q=",
  duckduckgo: "https://www.duckduckgo.com?q=",
  bing: "https://www.bing.com/search?q=",
  yahoo: "https://search.yahoo.com/search?p=",
  ecosia: "https://www.ecosia.org/search?q=",
};

export default async function command(props: LaunchProps<{ arguments: URLArguments }>) {
  const { url } = props.arguments;
  const { fallbackText } = props;
  const selectedText = await getSelectedText().catch(() => ""); // Ignore error, it's fine if there's no selected text.

  const selectedTextAsSearch = `${config[newLittleArcPreferences.engine]}${encodeURIComponent(selectedText)}`;

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
