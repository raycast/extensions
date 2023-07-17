import { LaunchProps, closeMainWindow, showHUD } from "@raycast/api";
import { makeNewLittleArcWindow } from "./arc";
import { newLittleArcPreferences } from "./preferences";
import { URLArguments } from "./types";
import { validateURL } from "./utils";

export default async function command(props: LaunchProps<{ arguments: URLArguments }>) {
  const { url } = props.arguments;
  const { fallbackText } = props;
  const newTabUrl = url || fallbackText || newLittleArcPreferences.url;

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
