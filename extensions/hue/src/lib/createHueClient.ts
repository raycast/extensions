import { ClientHttp2Session, connect, sensitiveHeaders } from "http2";
import React from "react";
import { BridgeConfig, GroupedLight, Light, Room, Scene, Zone } from "./types";
import dns from "dns";
import HueClient from "./HueClient";
import { getCaCertificate } from "../helpers/hueNetworking";

const CONNECTION_TIMEOUT_MS = 5000;

export default async function createHueClient(
  bridgeConfig: BridgeConfig,
  setLights?: React.Dispatch<React.SetStateAction<Light[]>>,
  setGroupedLights?: React.Dispatch<React.SetStateAction<GroupedLight[]>>,
  setRooms?: React.Dispatch<React.SetStateAction<Room[]>>,
  setZones?: React.Dispatch<React.SetStateAction<Zone[]>>,
  setScenes?: React.Dispatch<React.SetStateAction<Scene[]>>,
) {
  const http2Session = await new Promise<ClientHttp2Session>((resolve, reject) => {
    console.log("Connecting to the Hue Bridge…");

    /*
     * Connect to the Hue Bridge using the Bridge ID as the hostname instead of the IP address, which is then resolved
     * using the function provided to the `lookup` option. This is necessary because RFC 6066 does not permit connecting
     * to IP addresses using TLS.
     */
    const session = connect(`https://${bridgeConfig.id}`, {
      ca: getCaCertificate(),
      checkServerIdentity: (_hostname, peerCertificate) => {
        if (peerCertificate.subject.CN.toLowerCase() !== bridgeConfig.id.toLowerCase()) {
          throw new Error(
            "Server identity check failed. Certificate subject’s Common Name does not match the Bridge ID.",
          );
        }
        if (peerCertificate.issuer.CN !== "root-bridge") {
          throw new Error(
            "Server identity check failed. Certificate issuer’s Common Name does not match the expected value.",
          );
        }

        // The certificate is valid. Undefined is returned to indicate that the server identity check succeeded.
        return undefined;
      },
      lookup: (hostname, options, callback) => {
        if (bridgeConfig.ipAddress !== undefined && hostname.toLowerCase() === bridgeConfig.id) {
          // Resolve the hostname (which is the Bridge ID) to the IP address of the Hue Bridge
          callback(null, [{ address: bridgeConfig.ipAddress, family: 4 }]);
        } else {
          // Fallback to the default DNS lookup
          dns.lookup(hostname, options, callback);
        }
      },
    });

    session.setTimeout(CONNECTION_TIMEOUT_MS, () => {
      return reject("Connection timed out.");
    });

    session.once("connect", () => {
      // Make a request to the Hue Bridge to check if the username is valid
      const stream = session.request({
        ":method": "GET",
        ":path": "/clip/v2/resource/bridge",
        "hue-application-key": bridgeConfig.username,
        [sensitiveHeaders]: ["hue-application-key"],
      });

      stream.on("response", (response) => {
        if (response[":status"] === 403) {
          return reject("Please check your username.");
        } else if (response[":status"] !== 200) {
          return reject("Status code: " + response[":status"]);
        }
        return resolve(session);
      });
    });

    session.once("error", (error) => {
      return reject(error);
    });
  });

  return new HueClient(bridgeConfig, http2Session, setLights, setGroupedLights, setRooms, setZones, setScenes);
}
