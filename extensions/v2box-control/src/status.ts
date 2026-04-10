import { Toast, showHUD, showToast } from "@raycast/api";
import { formatState, getVpnStatus } from "./lib/vpn";

export default async function StatusCommand() {
  try {
    const status = await getVpnStatus();
    await showHUD(`VPN: ${formatState(status.state)}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "VPN: status error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
