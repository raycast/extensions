import { Alert, Clipboard, Icon, Toast, confirmAlert, showHUD, showToast } from "@raycast/api";

import { IVPN } from "@/api/ivpn";
import { verifyIvpnAuth } from "@/api/ivpn/utils";

export default async () => {
  const [isAuthenticated, authError] = await verifyIvpnAuth();
  if (!isAuthenticated) {
    await showToast({
      title: "Already logged out",
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Copy Logs",
        onAction: () => Clipboard.copy(authError.stack ?? String(authError)),
      },
    });
    return;
  }

  const confirmed = await confirmAlert({
    icon: Icon.Logout,
    title: "Log out of IVPN?",
    message: "Are you sure you'd like to log out?",
    primaryAction: { title: "Confirm", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return showHUD("Action Cancelled");

  const status = await IVPN.getStatus();
  if (status.vpnStatusSimplified !== "DISCONNECTED") {
    showToast({ title: "Disconnecting & logging out...", style: Toast.Style.Animated });
    await IVPN.disconnect();
  } else {
    showToast({ title: "Logging out...", style: Toast.Style.Animated });
  }

  await IVPN.logout();

  showToast({ title: "Logout Successful" });
};
