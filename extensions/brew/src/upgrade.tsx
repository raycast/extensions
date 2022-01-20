import { showToast, ToastStyle } from "@raycast/api";

import { brewUpgradeCommand } from "./brew";
import { preferences } from "./preferences";
import { showActionToast, showFailureToast } from "./utils";

export default async (): Promise<void> => {
  try {
    const abort = showActionToast({title: "Upgrading formula & casks" + String.ellipsis, cancelable: true});
    await brewUpgradeCommand(preferences.greedyUpgrades, false, abort);
    showToast(ToastStyle.Success, "Upgrade completed");
  } catch (err) {
    showFailureToast("Upgrade failed", err as Error);
  }
};
