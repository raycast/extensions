import { closeMainWindow, open } from "@raycast/api";
import { checkDropshareInstallation, isDropshareInstalled } from "./utils/check";

export default async () => {
  checkDropshareInstallation();

  if ((await isDropshareInstalled()) === true) {
    const url = "dropshare5:///action/capture-pretty";
    open(url);
    await closeMainWindow();
  }
};
