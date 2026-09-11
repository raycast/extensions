import { Toast, showHUD, showToast } from "@raycast/api";

import { IVPN } from "@/api/ivpn";
import { withNoViewErrorHandler } from "@/utils/errorHandler";

export default withNoViewErrorHandler(async () => {
  const ivpn = await IVPN.getStatus();

  if (ivpn.vpnStatusSimplified === "CONNECTING") {
    showHUD("IVPN Connecting...");
    return;
  }

  if (ivpn.vpnStatusSimplified === "DISCONNECTED") {
    showToast({ title: "IVPN Disconnected", style: Toast.Style.Failure });
    return;
  }

  if (ivpn.vpnStatusSimplified === "CONNECTED") {
    showToast({ title: "IVPN Connected" });
    return;
  }

  if (ivpn.vpnStatusSimplified === "ERROR") {
    showToast({ title: "Something went wrong", style: Toast.Style.Failure });
    return;
  }
});
