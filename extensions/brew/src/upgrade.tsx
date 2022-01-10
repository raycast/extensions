import { showToast, ToastStyle } from "@raycast/api";
import { showFailureToast } from "./utils";
import { brewUpgradeCommand } from "./brew";
import { preferences } from "./preferences";

export default async () => {
  try {
    showToast(ToastStyle.Animated, "Upgrading formula & casks" + String.ellipsis);
    await brewUpgradeCommand(preferences.greedyUpgrades);
    showToast(ToastStyle.Success, "Upgrade completed");
  } catch (err) {
    showFailureToast("Upgrade failed", err);
  }
};
