import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";
import { isSpacesInstalled } from "./checkInstall";

export default async () => {
  if (await isSpacesInstalled()) {
    const url = "spaces://stop";
    open(url);
    await closeMainWindow();
  } else {
    await showHUD("Spaces app is not installed");
  }
};
