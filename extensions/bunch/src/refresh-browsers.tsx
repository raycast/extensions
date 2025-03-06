import { scriptToRefreshBrowsers } from "./utils/applescript-utils";
import { closeMainWindow, showHUD } from "@raycast/api";
import { bunchInstalled } from "./utils/common-utils";
import { bunchNotInstallAlertDialog } from "./hooks/hooks";

export default async () => {
  if (!bunchInstalled()) {
    await bunchNotInstallAlertDialog();
    return;
  }
  await closeMainWindow({ clearRootSearch: false });
  const result = await scriptToRefreshBrowsers();
  await showHUD(result);
};
