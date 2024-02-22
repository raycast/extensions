import { closeMainWindow, showHUD, LaunchProps } from "@raycast/api";
import { makeNewTab } from "./arc";
import { newTabPreferences } from "./preferences";
import { URLArguments } from "./types";
import { validateURL } from "./utils";

const DEFAULT_PAGE = "arc://newtab";

const handleOpenNewTab = async (newTabUrl: string) => {
  try {
    if (await validateURL(newTabUrl)) {
      // Append https:// if protocol is missing
      const openURL = !/^\S+?:\/\//i.test(newTabUrl) ? "https://" + newTabUrl : newTabUrl;
      await closeMainWindow();
      await makeNewTab(openURL);
    }
  } catch (e) {
    console.error(e);

    await showHUD("❌ Failed opening a new tab");
  }
};

export default async function command(props: LaunchProps<{ arguments: URLArguments }>) {
  const { url } = props.arguments;
  const { fallbackText } = props;
  const newTabUrl = url || fallbackText || newTabPreferences.url || DEFAULT_PAGE;

  if (newTabUrl.includes(",")) {
    const multileTabs = newTabUrl.split(",").map((url) => handleOpenNewTab(url.trim()));

    return Promise.all(multileTabs);
  } else {
    return await handleOpenNewTab(newTabUrl);
  }
}
