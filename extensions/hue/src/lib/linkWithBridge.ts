import { BridgeConfig } from "./types";
import { createPemString, getCertificate, getUsernameFromBridge } from "../helpers/hueNetworking";
import { v3 } from "node-hue-api";

export async function linkWithBridge(bridgeIpAddress: string, bridgeUsername?: string): Promise<BridgeConfig> {
  // TODO: Remove dependency on node-hue-api
  // TODO: Reduce the number of calls to the Hue Bridge

  const peerCertificate = await getCertificate(bridgeIpAddress);
  const username = bridgeUsername ?? (await getUsernameFromBridge(bridgeIpAddress));

  // Get bridge ID using the new credentials
  const bridgeId: string = await (async () => {
    const api = await v3.api.createLocal(bridgeIpAddress).connect(username);
    const configuration = await api.configuration.getConfiguration();
    return configuration.bridgeid.toLowerCase();
  })();

  /*
   * The certificate subject’s Common Name field must be equal to the Bridge ID.
   * https://developers.meethue.com/develop/application-design-guidance/using-https/#Common%20name%20validation
   */
  if (peerCertificate.subject.CN !== bridgeId) {
    throw new Error("Certificate subject’s Common Name does not match bridgeId.");
  }

  /*
   * If the certificate issuer’s Common Name field is equal to the Bridge ID, the Bridge is running an older firmware
   * version. The self-signed certificate is saved and used for future connections.
   * https://developers.meethue.com/develop/application-design-guidance/using-https/#Self-signed%20certificates
   */
  if (peerCertificate.issuer.CN === bridgeId) {
    const certificate = await createPemString(peerCertificate);
    return {
      ipAddress: bridgeIpAddress,
      username: username,
      id: bridgeId,
      certificateType: "self-signed",
      certificate: certificate,
    };
  } else {
    return {
      ipAddress: bridgeIpAddress,
      username: username,
      id: bridgeId,
      certificateType: "signed-by-hue-bridge-root-ca",
    };
  }
}
