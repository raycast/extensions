import { LaunchProps, closeMainWindow, showHUD } from "@raycast/api";
import isUrl from "is-url";
import { makeNewLittleArcWindow } from "./arc";
import { newTabPreferences } from "./preferences";
import { Arcguments } from "./types";

export default async function command(props: LaunchProps<{ arguments: Arcguments }>) {
  const { url } = props.arguments;

  try {
    const newTabUrl = url || newTabPreferences.url;
    if (!isUrl(newTabUrl)) {
      throw new Error("❌ Invalid URL provided");
    }

    await closeMainWindow();
    await makeNewLittleArcWindow(newTabUrl);
  } catch (e) {
    console.error(e);

    await showHUD("❌ Failed opening a new little arc window.");
  }
}
