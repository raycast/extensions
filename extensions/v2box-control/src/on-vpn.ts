import { Toast, showHUD, showToast } from "@raycast/api";
import { formatState, turnOnVpn } from "./lib/vpn";

export default async function OnVpnCommand() {
  try {
    const status = await turnOnVpn();
    await showHUD(`VPN: ${formatState(status.state)}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "VPN: failed to start",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
