import { isAppInstalled } from "./utils/common-utils";
import { appNotInstallAlertDialog } from "./components/alert-dialogs";
import { showHUD } from "@raycast/api";
import { longBreak } from "./utils/applescript-utils";

export default async () => {
  if (!isAppInstalled()) {
    await appNotInstallAlertDialog();
    return;
  }
  await showHUD("Taking a long break...");
  await longBreak();
};
