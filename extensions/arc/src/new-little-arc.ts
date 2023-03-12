import { LaunchProps, closeMainWindow, showHUD } from "@raycast/api";
import { makeNewLittleArcWindow } from "./arc";
import { newTabPreferences } from "./preferences";
import { NewLittleArcArguments } from "./types";

export default async function command(props: LaunchProps<{ arguments: NewLittleArcArguments }>) {
  const { url } = props.arguments;

  try {
    const urlRegex = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;
    const newTabUrl = url || newTabPreferences.url;

    if (newTabUrl === undefined || newTabUrl === "") {
      return await showHUD("❌ No URL found");
    }

    if (!urlRegex.test(newTabUrl)) {
      return await showHUD("❌ Invalid URL provided");
    }

    // Append https:// if not http OR https is present
    const openURL = !/^https?:\/\//i.test(newTabUrl) ? "https://" + newTabUrl : newTabUrl;

    await closeMainWindow();
    await makeNewLittleArcWindow(openURL);
  } catch (e) {
    console.error(e);
    await showHUD("❌ Failed opening a new little arc window.");
  }
}
