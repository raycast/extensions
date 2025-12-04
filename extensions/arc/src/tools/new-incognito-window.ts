import { makeNewWindow } from "../arc";
import { NewTabSearchConfigs } from "../types";
import { isURL, validateURL } from "../utils";
import { NewIncognitoWindowPreferences } from "../preferences";

type Input = {
  /**
   * The URL to open in the new incognito window.
   *
   * @remarks
   * If no URL is provided, the default page will be opened.
   */
  url?: string;
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
  if (url) {
    if (!isURL(url)) {
      url = `${config[NewIncognitoWindowPreferences.engine as keyof NewTabSearchConfigs]}${encodeURIComponent(url)}`;
    }
  } else {
    url = NewIncognitoWindowPreferences.url;
  }

  if (!url) {
    // No URL given or set in preferences, so open blank incognito window.
    await makeNewWindow({ incognito: true });
  } else if (await validateURL(url)) {
    // Append https:// if protocol is missing
    if (!/^\S+?:\/\//i.test(url)) {
      url = "https://" + url;
    }
    await makeNewWindow({ incognito: true, url });
  }
};

export default tool;
