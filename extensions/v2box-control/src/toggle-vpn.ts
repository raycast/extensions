import { Toast, showHUD, showToast } from "@raycast/api";
import { formatState, toggleVpn } from "./lib/vpn";

export default async function ToggleVpnCommand() {
  try {
    const status = await toggleVpn();
    await showHUD(`VPN: ${formatState(status.state)}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "VPN: toggle failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
