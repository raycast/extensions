import { environment, WindowManagement } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getUserPreferences } from "./get-user-preferences";

export type DesktopContext = Readonly<{
  desktop: WindowManagement.Desktop;
  windows: WindowManagement.Window[];
}>;

export async function getDesktopContext(): Promise<DesktopContext | null> {
  if (!environment.canAccess(WindowManagement)) {
    await showFailureToast("Not Supported", {
      message: "This command requires access to Raycast WindowManagement API.",
    });
    return null;
  }

  const [desktops, windows] = await Promise.all([
    WindowManagement.getDesktops(),
    WindowManagement.getWindowsOnActiveDesktop(),
  ]);

  const activeDesktop = desktops?.find((desktop) => desktop.active);

  if (!activeDesktop) {
    await showFailureToast("No Desktops Found", {
      message: "Please make sure you have at least one desktop active.",
    });
    return null;
  }

  const { excludedApps } = getUserPreferences();

  const resizableWindows = windows?.filter((window) => {
    if (!window.resizable || !window.positionable) return false;
    if (excludedApps.length > 0) {
      const appName = (window.application?.name ?? "").toLowerCase();
      if (excludedApps.some((excluded) => appName.includes(excluded))) return false;
    }
    return true;
  });

  if (!resizableWindows?.length) {
    await showFailureToast("No resizable windows found", {
      message: "Please make sure you have at least one resizable window on the active desktop.",
    });
    return null;
  }

  return {
    desktop: activeDesktop,
    windows: resizableWindows,
  };
}
