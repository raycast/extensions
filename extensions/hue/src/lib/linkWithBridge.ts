import { BridgeConfig } from "./types";
import { createPemString, getCertificate, getUsernameFromBridge } from "../helpers/hueNetworking";
import fs from "fs";
import { environment } from "@raycast/api";

export async function linkWithBridge(bridgeIpAddress: string): Promise<BridgeConfig> {
  const bridgeCertificate = await getCertificate(bridgeIpAddress);
  const isSelfSigned = bridgeCertificate.subject.CN === bridgeCertificate.issuer.CN;
  const pemString = createPemString(bridgeCertificate);
  const certificate = isSelfSigned
    ? Buffer.from(pemString, "utf-8")
    : fs.readFileSync(environment.assetsPath + "/huebridge_cacert.pem");

  return {
    ipAddress: bridgeIpAddress,
    username: await getUsernameFromBridge(bridgeIpAddress, certificate),
    id: bridgeCertificate.subject.CN,
    certificateType: isSelfSigned ? "self-signed" : "signed-by-hue-bridge-root-ca",
    certificate: isSelfSigned ? pemString : undefined,
  };
}
