import { closeMainWindow, showHUD, LaunchProps } from "@raycast/api";
import { makeNewWindow } from "./arc";
import { validateURL } from "./utils";
import { URLArguments } from "./types";

const handleOpenNewIncognitoTab = async (newTabUrl: string) => {
  try {
    if (await validateURL(newTabUrl)) {
      // Append https:// if protocol is missing
      const openURL = !/^\S+?:\/\//i.test(newTabUrl) ? "https://" + newTabUrl : newTabUrl;
      await closeMainWindow();
      await makeNewWindow({ incognito: true, url: openURL });
    }
  } catch (e) {
    console.error(e);

    await showHUD("❌ Failed opening a new tab");
  }
};

export default async function command(props: LaunchProps<{ arguments: URLArguments }>) {
  const { url } = props.arguments;

  try {
    await closeMainWindow();
    if (!url) {
      await makeNewWindow({ incognito: true });
      return;
    }
    await handleOpenNewIncognitoTab(url);
  } catch {
    await showHUD("❌ Failed opening a new incognito window");
  }
}
