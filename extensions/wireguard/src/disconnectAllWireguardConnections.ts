import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { getConnectedVPNSNArray } from "./getVPN";
import { disconnectVPNBySN } from "./toggle";

export default async () => {
  await showToast(Toast.Style.Animated, "Disconnecting");
  const connectedVPNSNArray = await getConnectedVPNSNArray();
  if (connectedVPNSNArray?.length > 0) {
    for (const sn of connectedVPNSNArray) {
      await disconnectVPNBySN(sn);
    }
  }
  await showHUD(`✅ ${connectedVPNSNArray.length} VPNs DISCONNECTED`);
  await closeMainWindow({ clearRootSearch: true });
};
