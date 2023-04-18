import { ClientHttp2Session, connect } from "http2";
import React from "react";
import { BridgeConfig, GroupedLight, Light, Room, Scene, Zone } from "./types";
import fs from "fs";
import { environment } from "@raycast/api";
import dns from "dns";
import HueClient from "./HueClient";

const CONNECTION_TIMEOUT_MS = 5000;

export default async function createHueClient(
  bridgeConfig: BridgeConfig,
  setLights?: React.Dispatch<React.SetStateAction<Light[]>>,
  setGroupedLights?: React.Dispatch<React.SetStateAction<GroupedLight[]>>,
  setRooms?: React.Dispatch<React.SetStateAction<Room[]>>,
  setZones?: React.Dispatch<React.SetStateAction<Zone[]>>,
  setScenes?: React.Dispatch<React.SetStateAction<Scene[]>>
) {
  const http2Session = await new Promise<ClientHttp2Session>((resolve, reject) => {
    let certificate: Buffer | undefined;

    if (bridgeConfig.certificateType === "self-signed" && bridgeConfig.certificate) {
      certificate = Buffer.from(bridgeConfig.certificate, "utf-8");
      console.log("Connecting to Hue Bridge using self-signed certificate…");
    } else {
      certificate = fs.readFileSync(environment.assetsPath + "/huebridge_cacert.pem");
      console.log("Connecting to Hue Bridge and checking it's certificate against the Hue Bridge root CA…");
    }

    /*
     * Connect to the Hue Bridge using the Bridge ID as the hostname instead of the IP address, which is then resolved
     * using the function provided to the `lookup` option. This is necessary because connecting to IP addresses using
     * TLS is not permitted by RFC 6066.
     */
    const session = connect(`https://${bridgeConfig.id}`, {
      ca: certificate, // Either the bridge’s self-signed certificate or the Hue Bridge Root CA
      checkServerIdentity: (hostname, cert) => {
        if (cert.subject.CN !== bridgeConfig.id) {
          throw new Error(
            "Server identity check failed. Certificate subject’s Common Name does not match the Bridge ID."
          );
        }
        if (bridgeConfig.certificateType === "signed-by-hue-bridge-root-ca" && cert.issuer.CN !== "root-bridge") {
          throw new Error(
            "Server identity check failed. Certificate issuer’s Common Name does not match the expected value."
          );
        }
        if (bridgeConfig.certificateType === "self-signed" && cert.issuer.CN !== bridgeConfig.id) {
          throw new Error(
            "Server identity check failed. Certificate issuer’s Common Name does not match the Bridge ID."
          );
        }

        // The certificate is valid. Undefined is returned to indicate that the server identity check succeeded.
        return undefined;
      },
      lookup: (hostname, options, callback) => {
        if (hostname.toLowerCase() === bridgeConfig.id && bridgeConfig.ipAddress !== undefined) {
          // Resolve the Bridge ID to the IP address of the Hue Bridge
          callback(null, bridgeConfig.ipAddress, 4);
        } else {
          // Fallback to the default DNS lookup
          dns.lookup(hostname, options, callback);
        }
      },
    });

    session.setTimeout(CONNECTION_TIMEOUT_MS, () => {
      reject(new Error("Connection timed out."));
    });

    session.once("connect", () => {
      resolve(session);
    });

    session.once("error", (error) => {
      reject(error);
    });
  });

  return new HueClient(bridgeConfig, http2Session, setLights, setGroupedLights, setRooms, setZones, setScenes);
}
