import { closeMainWindow, open, showHUD } from "@raycast/api";
import { scriptToGetOpenBunches } from "./utils/applescript-utils";
import { bunchNotInstallAlertDialog } from "./hooks/hooks";
import { bunchInstalled } from "./utils/common-utils";

export default async () => {
  if (!bunchInstalled()) {
    await bunchNotInstallAlertDialog();
    return;
  }
  await closeMainWindow({ clearRootSearch: false });
  const openBunches = await scriptToGetOpenBunches();
  if (openBunches.length === 0) {
    await showHUD("No open bunches");
    return;
  }
  await open(encodeURI(`x-bunch://close/${openBunches.join(",")}`));
  await showHUD("Close bunches: " + openBunches.join(", "));
};
