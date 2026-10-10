import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { ClientHttp2Session, connect } from "http2";
import { BridgeConfig } from "./types";
import HueClient, { authHeaders } from "./HueClient";
import { checkBridgeIdentity, getCaCertificate } from "../helpers/hueNetworking";
import { BRIDGE_CONFIG_KEY, CONNECTION_TIMEOUT_MS } from "../helpers/constants";

export default async function createHueClient(bridgeConfig: BridgeConfig) {
  const http2Session = await new Promise<ClientHttp2Session>((resolve, reject) => {
    console.log("Connecting to the Hue Bridge…");

    // The certificate names the bridge ID, not its IP address, so the identity check replaces the hostname check
    const session = connect(`https://${bridgeConfig.ipAddress}`, {
      ca: getCaCertificate(),
      checkServerIdentity: (_hostname, peerCertificate) => checkBridgeIdentity(peerCertificate, bridgeConfig.id),
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
        // Only the status matters, and an open stream would keep HueClient.close() from ending the session
        stream.close();
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
