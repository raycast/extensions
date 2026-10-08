import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { ClientHttp2Session, connect } from "http2";
import { BridgeConfig } from "./types";
import dns from "dns";
import HueClient, { authHeaders } from "./HueClient";
import { checkBridgeIdentity, getCaCertificate } from "../helpers/hueNetworking";
import { BRIDGE_CONFIG_KEY, CONNECTION_TIMEOUT_MS } from "../helpers/constants";

export default async function createHueClient(bridgeConfig: BridgeConfig) {
  const http2Session = await new Promise<ClientHttp2Session>((resolve, reject) => {
    console.log("Connecting to the Hue Bridge…");

    /*
     * Connect to the Hue Bridge using the Bridge ID as the hostname instead of the IP address, which is then resolved
     * using the function provided to the `lookup` option. This is necessary because RFC 6066 does not permit connecting
     * to IP addresses using TLS.
     */
    const session = connect(`https://${bridgeConfig.id}`, {
      ca: getCaCertificate(),
      checkServerIdentity: (_hostname, peerCertificate) => checkBridgeIdentity(peerCertificate, bridgeConfig.id),
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
      return reject(new Error("Connection timed out."));
    });

    session.once("connect", () => {
      // Make a request to the Hue Bridge to check if the username is valid
      const stream = session.request({
        ":method": "GET",
        ":path": "/clip/v2/resource/bridge",
        ...authHeaders(bridgeConfig.username),
      });

      stream.on("response", (response) => {
        if (response[":status"] === 403) {
          return reject(new Error("Please check your username."));
        } else if (response[":status"] !== 200) {
          return reject(new Error(`Status ${response[":status"]}`));
        }
        return resolve(session);
      });
    });

    session.once("error", (error) => {
      return reject(error);
    });
  });

  return new HueClient(bridgeConfig, http2Session);
}

// The bridge IP address and username preferences override the saved configuration
export async function loadBridgeConfig(): Promise<BridgeConfig | undefined> {
  const saved = await LocalStorage.getItem<string>(BRIDGE_CONFIG_KEY);
  if (saved === undefined) return undefined;
  const { bridgeIpAddress, bridgeUsername } = getPreferenceValues<Preferences>();
  return {
    ...JSON.parse(saved),
    ...(bridgeIpAddress && { ipAddress: bridgeIpAddress }),
    ...(bridgeUsername && { username: bridgeUsername }),
  };
}
