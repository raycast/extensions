import { BridgeConfig } from "./types";
import { getUsernameFromBridge } from "../helpers/hueNetworking";

export async function linkWithBridge(
  bridgeIpAddress: string,
  bridgeId: string,
  bridgeUsername?: string,
): Promise<BridgeConfig> {
  return {
    ipAddress: bridgeIpAddress,
    username: bridgeUsername ? bridgeUsername : await getUsernameFromBridge(bridgeIpAddress, bridgeId),
    id: bridgeId,
  };
}
