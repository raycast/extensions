import { environment, getPreferenceValues, LocalStorage } from "@raycast/api";
import Bonjour from "bonjour-service";
import fs from "fs";
import * as http2 from "http2";
import * as https from "https";
import { isIPv4 } from "net";
import * as tls from "tls";
import { APP_NAME, BRIDGE_CONFIG_KEY, CONNECTION_TIMEOUT_MS } from "../helpers/constants";
import HueClient, { authHeaders } from "./HueClient";
import { BridgeConfig, HueApiService, LinkResponse } from "./types";

/**
 * Ignoring that there could be more than one Hue Bridge on a network as this is rare.
 */
export async function discoverBridgeUsingMdns(): Promise<{ ipAddress: string; id?: string }> {
  console.info("Discovering bridge using mDNS…");

  return new Promise((resolve, reject) => {
    const bonjour = new Bonjour();
    // Calls back with null after the timeout
    bonjour.findOne(
      { type: "hue", protocol: "tcp" },
      10000,
      (service: { addresses?: string[]; txt?: { bridgeid: string } } | null) => {
        bonjour.destroy();

        const ipAddress = service?.addresses?.find(isIPv4);
        if (service === null || ipAddress === undefined)
          return reject(new Error("Could not find a Hue Bridge using mDNS"));

        const id = service.txt?.bridgeid;
        console.info(`Discovered Hue Bridge using mDNS: ${ipAddress}, ${id}`);
        resolve({ ipAddress, id });
      },
    );
  });
}

/**
 * Ignoring that there could be more than one Hue Bridge on a network as this is rare.
 * The endpoint allows one request per 15 minutes per client.
 */
export async function discoverBridgeUsingHuePublicApi(): Promise<{ ipAddress: string; id: string }> {
  console.info("Discovering bridge using MeetHue's public API…");

  const response = await fetch("https://discovery.meethue.com", { signal: AbortSignal.timeout(CONNECTION_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Status ${response.status} from MeetHue's public API`);

  const [bridge] = (await response.json()) as HueApiService[];
  if (bridge === undefined) throw new Error("Could not find a Hue Bridge using MeetHue's public API");

  console.info(`Discovered Hue Bridge using MeetHue's public API: ${bridge.internalipaddress}, ${bridge.id}`);
  return { ipAddress: bridge.internalipaddress, id: bridge.id };
}

export async function linkWithBridge(
  bridgeIpAddress: string,
  bridgeId?: string,
  bridgeUsername?: string,
): Promise<BridgeConfig> {
  const id = bridgeId ?? (await fetchBridgeId(bridgeIpAddress));
  return {
    ipAddress: bridgeIpAddress,
    username: bridgeUsername ? bridgeUsername : await createUsername(bridgeIpAddress, id),
    id,
  };
}

export async function createHueClient(bridgeConfig: BridgeConfig) {
  const http2Session = await new Promise<http2.ClientHttp2Session>((resolve, reject) => {
    console.log("Connecting to the Hue Bridge…");

    const session = http2.connect(`https://${bridgeConfig.ipAddress}`, bridgeTlsOptions(bridgeConfig.id));

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

export function saveBridgeConfig(bridgeConfig: BridgeConfig): Promise<void> {
  return LocalStorage.setItem(BRIDGE_CONFIG_KEY, JSON.stringify(bridgeConfig));
}

// Also clears the bridgeIpAddress and bridgeUsername keys that version 1 stored
export function clearBridgeConfig(): Promise<void> {
  return LocalStorage.clear();
}

async function createUsername(ipAddress: string, bridgeId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        method: "POST",
        path: "/api",
        hostname: ipAddress,
        port: 443,
        agent: new https.Agent(bridgeTlsOptions(bridgeId)),
        timeout: CONNECTION_TIMEOUT_MS,
        headers: {
          "Content-Type": "application/json",
        },
      },
      (response) => {
        if (response.statusCode !== 200) {
          return reject(new Error(`Status ${response.statusCode} from Hue Bridge`));
        }

        response.on("data", (data) => {
          const response: LinkResponse = JSON.parse(data.toString())[0];
          if (response.error?.description) {
            const errorDescription = response.error.description;
            return reject(new Error(errorDescription.charAt(0).toUpperCase() + errorDescription.slice(1)));
          }
          if (response.success) {
            return resolve(response.success.username);
          }
        });
      },
    );

    request.on("timeout", () => {
      request.destroy();
      reject(new Error("Request to Hue Bridge timed out"));
    });

    request.on("error", (error) => {
      return reject(error);
    });

    request.write(
      JSON.stringify({
        devicetype: APP_NAME,
        generateclientkey: true,
      }),
    );

    request.end();
  });
}

function fetchBridgeId(ipAddress: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: ipAddress, port: 443, ...bridgeTlsOptions() }, () => {
      const cert = socket.getPeerCertificate();
      socket.destroy();
      resolve(getCommonName(cert));
    });

    socket.setTimeout(CONNECTION_TIMEOUT_MS, () => {
      socket.destroy();
      reject(new Error("Timed out fetching bridge ID from certificate"));
    });

    socket.on("error", (error) => {
      socket.destroy();
      reject(error);
    });
  });
}

/**
 * The ca option checks the chain against the bundled root certificates. The bridge certificate's subject Common Name
 * is the bridge ID, not its IP address, so checking it replaces Node's hostname check, as Signify's "Using HTTPS"
 * guide describes. Without a bridge ID, which fetchBridgeId reads from the certificate, only the chain is checked.
 * checkServerIdentity returns its error like tls.checkServerIdentity does: a thrown error is uncaught and the
 * connection carries on.
 * https://developers.meethue.com/develop/application-design-guidance/using-https/#Common%20name%20validation
 */
function bridgeTlsOptions(bridgeId?: string) {
  return {
    ca: loadCaCertificate(),
    checkServerIdentity: (_hostname: string, certificate: tls.PeerCertificate) => {
      if (bridgeId !== undefined && getCommonName(certificate).toLowerCase() !== bridgeId.toLowerCase()) {
        return new Error(
          "Server identity check failed. Certificate subject’s Common Name does not match the Bridge ID.",
        );
      }
    },
  };
}

/**
 * A certificate's Common Name (CN) may be a string, an array of strings, or undefined.
 * The Hue Bridge certificate always uses a single CN, so it is normalized to a string.
 */
function getCommonName(certificate: tls.PeerCertificate): string {
  const commonName = certificate.subject.CN;
  return Array.isArray(commonName) ? (commonName[0] ?? "") : (commonName ?? "");
}

let caCertificate: Buffer | undefined;

function loadCaCertificate(): Buffer {
  caCertificate ??= fs.readFileSync(environment.assetsPath + "/huebridge_cacert.pem");
  return caCertificate;
}
