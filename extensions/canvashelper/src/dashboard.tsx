import { open, showToast, Toast } from "@raycast/api";
import CanvasAPI from "./canvas-api";

export default async function Command() {
  try {
    const api = new CanvasAPI();
    const dashboardUrl = api.getDashboardUrl();

    // Immediately open the dashboard in the browser
    await open(dashboardUrl);

    showToast({
      style: Toast.Style.Success,
      title: "Canvas Dashboard Opened",
      message: "Taking you to your Canvas dashboard...",
    });
  } catch (err) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to open dashboard",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
