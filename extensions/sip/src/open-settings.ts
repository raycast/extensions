import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";
import { SipInstallationCheck } from "./checkInstall";

export default async () => {
  if (await SipInstallationCheck()) {
    const url = "sip://settings";
    open(url);
    await closeMainWindow();
    await showHUD("Opened Sip settings ⚙️");
  }
};
