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
};

const tool = async ({ url }: Input) => {
  let NewIncognitoWindow = "";

  if (url) {
    NewIncognitoWindow = url;
    const NewIncognitoWindowAsSearch = `${config[NewIncognitoWindowPreferences.engine as keyof NewTabSearchConfigs]}${encodeURIComponent(NewIncognitoWindow)}`;
    NewIncognitoWindow = isURL(NewIncognitoWindow) ? NewIncognitoWindow : NewIncognitoWindowAsSearch;
  } else {
    NewIncognitoWindow = NewIncognitoWindowPreferences.url;
  }

  if (await validateURL(NewIncognitoWindow)) {
    // Append https:// if protocol is missing
    const openURL = !/^\S+?:\/\//i.test(NewIncognitoWindow) ? "https://" + NewIncognitoWindow : NewIncognitoWindow;

    await makeNewWindow({ incognito: true, url: openURL });
  }
};

export default tool;
