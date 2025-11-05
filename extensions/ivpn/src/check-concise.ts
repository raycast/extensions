import { Toast, showHUD, showToast } from "@raycast/api";

import { IVPN } from "@/api/ivpn";
import { withNoViewErrorHandler } from "@/utils/errorHandler";

export default withNoViewErrorHandler(async () => {
  const ivpn = await IVPN.getStatus();

  if (ivpn.vpnStatus === "AUTH") {
    showHUD("IVPN Connecting...");
    return;
  }

  if (ivpn.vpnStatus === "DISCONNECTED") {
    showToast({ title: "IVPN Disconnected", style: Toast.Style.Failure });
    return;
  }

  if (ivpn.vpnStatus === "CONNECTED") {
    showToast({ title: "IVPN Connected" });
    return;
  }
});
