import { closeMainWindow } from "@raycast/api";
import { getConnectedVPNSNArray } from "./getVPN";
import { disconnectVPNBySN } from "./toggle";

export default async () => {
  const connectedVPNSNArray = await getConnectedVPNSNArray();
  if (connectedVPNSNArray?.length > 0) {
    for (const sn of connectedVPNSNArray) {
      await disconnectVPNBySN(sn);
    }
  }
  await closeMainWindow({ clearRootSearch: true });
};
