import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";
import { SipInstallationCheck } from "./checkInstall";

export default async () => {
  if (await SipInstallationCheck()) {
    const url = "sip://contrast";
    open(url);
    await closeMainWindow();
    await showHUD("Opened Sip contrast checker 🎨");
  }
};
