import { environment, WindowManagement } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function getResizableWindows() {
  if (!environment.canAccess(WindowManagement)) {
    showFailureToast("Error!", {
      title: "Not Supported",
      message: "This script requires access to Raycast WindowManagement API.",
    });
    return [];
  }

  const windows = await WindowManagement.getWindowsOnActiveDesktop();
  const resizableWindows = windows?.filter((window) => window.resizable && window.positionable);

  if (!windows?.length || !resizableWindows?.length) {
    showFailureToast("Error!", {
      title: "No resizable windows found",
      message: "Please make sure you have at least one resizable window on the active desktop.",
    });
    return [];
  }

  return resizableWindows;
}
