import {
  closeMainWindow,
  open,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { openCompanion } from "./lib/bridge";
import { RELEASES_URL } from "./lib/companion";

export default async function OpenFloatingList() {
  try {
    await closeMainWindow();
    await openCompanion();
    await showHUD("Opened super todo");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open Floating List",
      message: error instanceof Error ? error.message : String(error),
      primaryAction: {
        title: "Get Companion App",
        onAction: () => open(RELEASES_URL),
      },
      secondaryAction: {
        title: "Configure Companion App",
        onAction: openExtensionPreferences,
      },
    });
  }
}
