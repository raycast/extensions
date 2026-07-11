import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";
import { isSpacesInstalled } from "./checkInstall";

export default async () => {
  if (await isSpacesInstalled()) {
    const url = "spaces://createspace";
    open(url);
    await closeMainWindow();
    await showHUD("Spaces app opened");
  } else {
    await showHUD("Spaces app is not installed");
  }
};
