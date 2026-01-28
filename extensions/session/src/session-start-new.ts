import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";
import { SessionInstallationCheck } from "./checkInstall";

export default async () => {
  if (await SessionInstallationCheck()) {
    const url = "session:///start-previous";
    open(url);
    await closeMainWindow();
    await showHUD("Previous session started ⏲️");
  }
};
