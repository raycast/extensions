import {
  PopToRootType,
  Toast,
  closeMainWindow,
  getFrontmostApplication,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { hasAccessibility, sweepDock } from "swift:../swift";

const ACCESSIBILITY_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

export default async function Command() {
  try {
    if (!(await hasAccessibility())) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Raycast needs Accessibility access",
        message: "Dock Cleanup uses it to find and remove Dock icons.",
        primaryAction: { title: "Open Accessibility Settings", onAction: () => open(ACCESSIBILITY_SETTINGS) },
      });
      return;
    }

    const { protectedApps = "" } = getPreferenceValues<Preferences.DockCleanup>();
    const protectedList = protectedApps
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    // The app that was in front before Raycast opened gets focus back when the sweep ends.
    const previousApp = await getFrontmostApplication().catch(() => undefined);

    // Close Raycast first so the selection overlay gets the mouse and keyboard.
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    await sweepDock(protectedList, previousApp?.bundleId ?? "");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't clean up the Dock" });
  }
}
