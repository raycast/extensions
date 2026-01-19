import { Toast, getPreferenceValues, showHUD, showToast } from "@raycast/api";

import { IVPN } from "@/api/ivpn";
import { withNoViewErrorHandler } from "@/utils/errorHandler";

export default withNoViewErrorHandler(async () => {
  const initially = await IVPN.getStatus();

  if (initially.vpnStatusSimplified === "CONNECTING") {
    showHUD("IVPN is already trying to connect");
    return;
  }

  if (initially.vpnStatusSimplified === "DISCONNECTED") {
    showToast({ title: "IVPN Connecting...", style: Toast.Style.Animated });
    await IVPN.connect({
      strategy: getPrefs().defaultConnectStrategy,
      protocol: getPrefs().preferredProtocol,
    });
    showToast({ title: "IVPN Connected" });
    return;
  }

  if (initially.vpnStatusSimplified === "CONNECTED") {
    showToast({ title: "IVPN Disconnecting...", style: Toast.Style.Animated });
    await IVPN.disconnect();
    showToast({ title: "IVPN Disconnected", style: Toast.Style.Failure });
    return;
  }

  if (initially.vpnStatusSimplified === "ERROR") {
    showToast({ title: "Something went wrong", style: Toast.Style.Failure });
  }
});

const getPrefs = () => getPreferenceValues<Preferences.ToggleConcise>();
