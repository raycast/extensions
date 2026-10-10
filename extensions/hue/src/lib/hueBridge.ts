import { environment, getPreferenceValues, LocalStorage } from "@raycast/api";
import Bonjour from "bonjour-service";
import fs from "fs";
import * as http2 from "http2";
import { isIPv4 } from "net";
import type { PeerCertificate, TLSSocket } from "tls";
import { APP_NAME, BRIDGE_CONFIG_KEY, CONNECTION_TIMEOUT_MS } from "../helpers/constants";
import HueClient, { authHeaders, request } from "./HueClient";
import { BridgeConfig, HueApiService, LinkResponse } from "./types";

/**
 * Ignoring that there could be more than one Hue Bridge on a network as this is rare.
 */
export async function discoverBridgeUsingMdns(): Promise<{ ipAddress: string; id?: string }> {
  console.info("Discovering bridge using mDNS…");

  return new Promise((resolve, reject) => {
    const bonjour = new Bonjour();
    // Calls back with null after the timeout
    const browser = bonjour.findOne(
      { type: "hue" },
      3000,
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
    // The browser queries once, and a lost packet would otherwise run out the timeout. After destroy() this does nothing.
    setTimeout(() => browser.update(), 1000);
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

// Without a bridge ID, the certificate's Common Name supplies it, and without a username, the link button creates one.
export async function linkWithBridge(ipAddress: string, bridgeId?: string, bridgeUsername?: string) {
  const session = await connect(ipAddress, bridgeId);
  try {
    const bridgeConfig = {
      ipAddress,
      id: bridgeId ?? getCommonName((session.socket as TLSSocket).getPeerCertificate()),
      username: bridgeUsername || (await createUsername(session)),
    };
    return { bridgeConfig, hueClient: await createHueClient(bridgeConfig, session) };
  } catch (error) {
    session.close();
    throw error;
  }
}

export async function createHueClient(bridgeConfig: BridgeConfig, session?: http2.ClientHttp2Session) {
  session ??= await connect(bridgeConfig.ipAddress, bridgeConfig.id);
  try {
    // Checks the username
    const { headers } = await request(session, {
      ":method": "GET",
      ":path": "/clip/v2/resource/bridge",
      ...authHeaders(bridgeConfig.username),
    });
    if (headers[":status"] === 403) throw new Error("Please check your username.");
    if (headers[":status"] !== 200) throw new Error(`Status ${headers[":status"]}`);
    return new HueClient(bridgeConfig, session);
  } catch (error) {
    session.close();
    throw error;
  }
}

function connect(ipAddress: string, bridgeId?: string): Promise<http2.ClientHttp2Session> {
  return new Promise((resolve, reject) => {
    console.log("Connecting to the Hue Bridge…");
    const session = http2.connect(`https://${ipAddress}`, bridgeTlsOptions(bridgeId));
    // Requests have their own deadline, and the client's session stays open while idle.
    session.setTimeout(CONNECTION_TIMEOUT_MS, () => session.destroy(new Error("Connection timed out.")));
    session.once("connect", () => {
      session.setTimeout(0);
      resolve(session);
    });
    session.once("error", reject);
  });
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

// The link button must have been pressed in the last 30 seconds.
async function createUsername(session: http2.ClientHttp2Session): Promise<string> {
  const { headers, data } = await request(
    session,
    { ":method": "POST", ":path": "/api", "content-type": "application/json" },
    { devicetype: APP_NAME, generateclientkey: true },
  );
  if (headers[":status"] !== 200) throw new Error(`Status ${headers[":status"]} from Hue Bridge`);
  const [response]: LinkResponse[] = JSON.parse(data);
  if (response?.success) return response.success.username;
  const description = response?.error?.description ?? "Unexpected response from Hue Bridge";
  throw new Error(description.charAt(0).toUpperCase() + description.slice(1));
}

/**
 * The ca option checks the chain against the bundled root certificates. The bridge certificate's subject Common Name
 * is the bridge ID, not its IP address, so checking it replaces Node's hostname check, as Signify's "Using HTTPS"
 * guide describes. Without a bridge ID, which linkWithBridge reads from the certificate, only the chain is checked.
 * checkServerIdentity returns its error like tls.checkServerIdentity does: a thrown error is uncaught and the
 * connection carries on.
 * https://developers.meethue.com/develop/application-design-guidance/using-https/#Common%20name%20validation
 */
function bridgeTlsOptions(bridgeId?: string) {
  return {
    ca: loadCaCertificate(),
    checkServerIdentity: (_hostname: string, certificate: PeerCertificate) => {
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
function getCommonName(certificate: PeerCertificate): string {
  const commonName = certificate.subject.CN;
  return Array.isArray(commonName) ? (commonName[0] ?? "") : (commonName ?? "");
}

let caCertificate: Buffer | undefined;

function loadCaCertificate(): Buffer {
  caCertificate ??= fs.readFileSync(environment.assetsPath + "/huebridge_cacert.pem");
  return caCertificate;
}
