import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { getPiholeAPI } from "./api/client";
import { isV6 } from "./utils";

export default async function RestartDNS() {
  if (!isV6()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "This command requires Pi-hole v6",
    });
    return;
  }

  if (
    !(await confirmAlert({
      title: "Restart DNS Resolver",
      message: "Are you sure you want to restart the DNS resolver?",
      primaryAction: { title: "Restart", style: Alert.ActionStyle.Destructive },
    }))
  ) {
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Restarting DNS resolver...",
  });

  try {
    const api = getPiholeAPI();
    await api.restartDNS();
    await showToast({
      style: Toast.Style.Success,
      title: "DNS resolver restarted",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to restart DNS",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
