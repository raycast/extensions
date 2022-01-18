import { showToast, ToastStyle } from "@raycast/api";
import { showFailureToast } from "./utils";
import { brewUpgradeCommand } from "./brew";
import { preferences } from "./preferences";
import { showActionToast } from "./utils";

export default async () => {
  try {
    const abort = showActionToast({title: "Upgrading formula & casks" + String.ellipsis, cancelable: true});
    await brewUpgradeCommand(preferences.greedyUpgrades, false, abort);
    showToast(ToastStyle.Success, "Upgrade completed");
  } catch (err) {
    showFailureToast("Upgrade failed", err);
  }
};
