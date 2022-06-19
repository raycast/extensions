import { closeMainWindow, open, showHUD } from "@raycast/api";
import { bunchInstalled } from "./utils/common-utils";
import { bunchNotInstallAlertDialog } from "./hooks/hooks";

export default async () => {
  if (!bunchInstalled()) {
    await bunchNotInstallAlertDialog();
    return;
  }
  await closeMainWindow({ clearRootSearch: false });
  await open(encodeURI("x-bunch://reveal"));
  await showHUD("Open Bunch folder");
};
