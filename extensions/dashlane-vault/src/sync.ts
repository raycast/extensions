import { Toast, showToast } from "@raycast/api";

import { syncVault } from "@/lib/dcli";

export default async function sync() {
  try {
    const toast = await showToast({
      title: "Syncing with Dashlane",
      style: Toast.Style.Animated,
    });

    await syncVault();

    toast.style = Toast.Style.Success;
    toast.title = "Sync with Dashlane succeeded";
  } catch (error) {
    showToast({
      title: "Dashlane sync failed",
      style: Toast.Style.Failure,
    });
  }
}
