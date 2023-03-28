import { closeMainWindow } from "@raycast/api";
import { getConnectedVPN } from "./getVPN";
import { disconnectVPNByName } from "./toggle";

export default async () => {
  const connectedVPN = await getConnectedVPN();
  if (connectedVPN !== "") {
    const connectedVPNList = connectedVPN.split(/\r?\n/);
    for (const VPNName of connectedVPNList) {
      await disconnectVPNByName(VPNName);
    }
  } else {
    await closeMainWindow({ clearRootSearch: true });
  }
};
