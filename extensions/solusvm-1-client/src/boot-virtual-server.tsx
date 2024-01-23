import { Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { bootVirtualServer } from "./api";
import { CONFIRM_BEFORE_ACTIONS } from "./constants";

export default async function BootVirtualServer() {
  if (CONFIRM_BEFORE_ACTIONS) {
    if (
      await confirmAlert({
        title: `Boot Virtual Server?`,
        icon: Icon.Power,
      })
    ) {
      const response = await bootVirtualServer();
      if (response.status === "success") {
        await showToast(Toast.Style.Success, "SUCCESS", "Booted");
      }
    }
  } else {
    const response = await bootVirtualServer();
    if (response.status === "success") {
      await showToast(Toast.Style.Success, "SUCCESS", "Booted");
    }
  }
}
