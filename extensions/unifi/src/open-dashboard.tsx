import { open, showHUD, showToast, Toast } from "@raycast/api";
import { GetDashboardUrl } from "./lib/unifi/unifi";
import { getAuthPreferences, hasAuth, isLegacy } from "./lib/auth";

export default async function OpenDashboard() {
  const { controllerUrl } = getAuthPreferences();

  if (!hasAuth() && !isLegacy()) {
    showToast({
      style: Toast.Style.Failure,
      title: "You must authenticate",
      message: "Please authenticate to use this command",
    });
    return;
  }

  const dash = GetDashboardUrl(controllerUrl);
  open(dash);
  showHUD("Opening UniFi Dashboard");
}
