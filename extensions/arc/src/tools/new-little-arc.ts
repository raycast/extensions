import { makeNewLittleArcWindow } from "../arc";
import { newLittleArcPreferences } from "../preferences";
import { NewTabSearchConfigs } from "../types";
import { isURL, validateURL } from "../utils";

type Input = {
  /**
   * The URL to open in a new small Arc window.
   */
  url: string;
};

export const config: NewTabSearchConfigs = {
  google: "https://www.google.com/search?q=",
  duckduckgo: "https://www.duckduckgo.com?q=",
  bing: "https://www.bing.com/search?q=",
  yahoo: "https://search.yahoo.com/search?p=",
  ecosia: "https://www.ecosia.org/search?q=",
  kagi: "https://kagi.com/search?q=",
  unduck: "https://unduck.link?q=",
};

const tool = async ({ url }: Input) => {
  let newTabUrl = url;

  if (newTabUrl) {
    const newTabUrlAsSearch = `${config[newLittleArcPreferences.engine as keyof NewTabSearchConfigs]}${encodeURIComponent(newTabUrl)}`;
    newTabUrl = isURL(newTabUrl) ? newTabUrl : newTabUrlAsSearch;
  } else {
    newTabUrl = newLittleArcPreferences.url;
  }

  if (await validateURL(newTabUrl)) {
    // Append https:// if protocol is missing
    const openURL = !/^\S+?:\/\//i.test(newTabUrl) ? "https://" + newTabUrl : newTabUrl;

    await makeNewLittleArcWindow(openURL);
  }
};

export default tool;
