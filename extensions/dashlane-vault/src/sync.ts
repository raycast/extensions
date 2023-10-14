import { Toast, showToast } from "@raycast/api";

import { checkIfInstalled } from "./helper/install-check";
import { sync } from "./lib/dcli";

export default checkIfInstalled(async () => {
  try {
    const toast = await showToast({
      title: "Syncing with Dashlane...",
      style: Toast.Style.Animated,
    });

    await sync();

    toast.style = Toast.Style.Success;
    toast.title = "Sync with Dashlane succeeded";
  } catch (error) {
    showToast({
      title: "Dashlane sync failed",
      style: Toast.Style.Failure,
    });
  }
});
