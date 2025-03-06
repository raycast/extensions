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
};

export default async function command(props: LaunchProps<{ arguments: URLArguments }>) {
  const { url } = props.arguments;

  let NewIncognitoWindow = "";

  if (url) {
    NewIncognitoWindow = url;
    const NewIncognitoWindowAsSearch = `${config[NewIncognitoWindowPreferences.engine as keyof NewTabSearchConfigs]}${encodeURIComponent(NewIncognitoWindow)}`;
    NewIncognitoWindow = isURL(NewIncognitoWindow) ? NewIncognitoWindow : NewIncognitoWindowAsSearch;
  } else {
    NewIncognitoWindow = NewIncognitoWindowPreferences.url;
  }

  try {
    if (await validateURL(NewIncognitoWindow)) {
      // Append https:// if protocol is missing
      const openURL = !/^\S+?:\/\//i.test(NewIncognitoWindow) ? "https://" + NewIncognitoWindow : NewIncognitoWindow;

      await closeMainWindow();
      await makeNewWindow({ incognito: true, url: openURL });
    }
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed opening a new incognito window",
    });
  }
}
