import { Toast, showHUD, showToast } from "@raycast/api";
import { formatState, turnOffVpn } from "./lib/vpn";

export default async function OffVpnCommand() {
  try {
    const status = await turnOffVpn();
    await showHUD(`VPN: ${formatState(status.state)}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "VPN: failed to stop",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
