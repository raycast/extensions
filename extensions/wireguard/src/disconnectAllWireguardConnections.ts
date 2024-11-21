import { closeMainWindow, showHUD } from "@raycast/api";
import { getConnectedVPNSNArray } from "./getVPN";
import { disconnectVPNBySN } from "./toggle";

export default async () => {
  const connectedVPNSNArray = await getConnectedVPNSNArray();
  if (connectedVPNSNArray?.length > 0) {
    for (const sn of connectedVPNSNArray) {
      await disconnectVPNBySN(sn);
    }
    await showHUD(`${connectedVPNSNArray.length} VPNs DISCONNECTED`);
  }
  await closeMainWindow({ clearRootSearch: true });
};
