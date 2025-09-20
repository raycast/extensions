import { Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { rebootVirtualServer } from "./api";
import { CONFIRM_BEFORE_ACTIONS } from "./constants";

export default async function RebootVirtualServer() {
  if (CONFIRM_BEFORE_ACTIONS) {
    if (
      await confirmAlert({
        title: `Reboot Virtual Server?`,
        icon: Icon.Power,
      })
    ) {
      const response = await rebootVirtualServer();
      if (response.status === "success") {
        await showToast(Toast.Style.Success, "SUCCESS", "Rebooted");
      }
    }
  } else {
    const response = await rebootVirtualServer();
    if (response.status === "success") {
      await showToast(Toast.Style.Success, "SUCCESS", "Rebooted");
    }
  }
}
