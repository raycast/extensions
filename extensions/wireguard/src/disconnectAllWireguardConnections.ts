import { closeMainWindow } from "@raycast/api";
import { getConnectedVPNArray } from "./getVPN";
import { disconnectVPNByName } from "./toggle";

export default async () => {
  const connectedVPNArray = await getConnectedVPNArray();
  if (connectedVPNArray?.length > 0) {
    for (const VPNName of connectedVPNArray) {
      await disconnectVPNByName(VPNName);
    }
  }
  await closeMainWindow({ clearRootSearch: true });
};
