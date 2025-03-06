import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";
import { SessionInstallationCheck } from "./checkInstall";

export default async () => {
  if (await SessionInstallationCheck()) {
    const url = "session:///break";
    open(url);
    await closeMainWindow();
    await showHUD("Break started ⏲️");
  }
};
