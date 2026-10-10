import { BridgeConfig } from "./types";
import { getBridgeIdFromCertificate, getUsernameFromBridge } from "./hueBridge";

export async function linkWithBridge(
  bridgeIpAddress: string,
  bridgeId?: string,
  bridgeUsername?: string,
): Promise<BridgeConfig> {
  const id = bridgeId ?? (await getBridgeIdFromCertificate(bridgeIpAddress));
  return {
    ipAddress: bridgeIpAddress,
    username: bridgeUsername ? bridgeUsername : await getUsernameFromBridge(bridgeIpAddress, id),
    id,
  };
}
