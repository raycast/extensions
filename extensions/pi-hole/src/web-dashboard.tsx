import { open, showToast, Toast } from "@raycast/api";
import { getPreferences } from "./utils/preferences";

export default function WebDashboardCommand() {
  const preferences = getPreferences();

  const openDashboard = async () => {
    try {
      // Construct the admin dashboard URL
      const dashboardUrl = `${preferences.piholeUrl}/admin/`;

      await showToast({
        style: Toast.Style.Success,
        title: "Opening Pi-hole Dashboard",
        message: "Opening in your default browser...",
      });

      await open(dashboardUrl);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Open Dashboard",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  // Execute immediately since this is a no-view command
  openDashboard();

  return null;
}
