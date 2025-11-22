import { Toast, getPreferenceValues, showToast } from "@raycast/api";

import { IVPN } from "@/api/ivpn";
import { IvpnInfoMap } from "@/api/ivpn/types";
import { withNoViewErrorHandler } from "@/utils/errorHandler";

export default withNoViewErrorHandler(async () => {
  showToast({ title: "IVPN Connecting...", style: Toast.Style.Animated });
  const info = (await IVPN.connect({
    strategy: "FASTEST",
    protocol: getPrefs().preferredProtocol,
  })) as IvpnInfoMap["CONNECTED"];
  const { city, countryCode } = info.serverLocation;
  showToast({ title: `IVPN Connected to ${city}, ${countryCode}` });
});

const getPrefs = () => getPreferenceValues<Preferences.QuickConnect>();
