import { environment, WindowManagement } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function getActiveDesktop() {
  if (!environment.canAccess(WindowManagement)) {
    showFailureToast("Error!", {
      title: "Not Supported",
      message: "This script requires access to Raycast WindowManagement API.",
    });
    return null;
  }

  const desktops = await WindowManagement.getDesktops();
  const activeDesktop = desktops?.find((desktop) => desktop.active);

  if (!desktops?.length || !activeDesktop) {
    showFailureToast("Error!", {
      title: "No Desktops Found",
      message: "Please make sure you have at least one desktop active.",
    });
    return null;
  }

  return activeDesktop;
}
