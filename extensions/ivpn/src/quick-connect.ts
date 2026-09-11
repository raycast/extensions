import { Toast, getPreferenceValues, showToast } from "@raycast/api";

import { IVPN } from "@/api/ivpn";
import { withNoViewErrorHandler } from "@/utils/errorHandler";

export default withNoViewErrorHandler(async () => {
  showToast({ title: "IVPN Connecting...", style: Toast.Style.Animated });
  await IVPN.connect({
    strategy: getPrefs().defaultConnectStrategy,
    protocol: getPrefs().preferredProtocol,
  });
  showToast({ title: "IVPN Connected" });
});

const getPrefs = () => getPreferenceValues<Preferences.QuickConnect>();
