import { APP_NAME, CONNECTION_TIMEOUT_MS } from "./constants";
import { connect, PeerCertificate } from "tls";
import * as https from "https";
import { HueApiService, LinkResponse } from "../lib/types";
import Bonjour from "bonjour-service";
import { isIPv4 } from "net";
import { environment } from "@raycast/api";
import fs from "fs";

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

export async function getUsernameFromBridge(ipAddress: string, bridgeId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        method: "POST",
        path: "/api",
        hostname: ipAddress,
        port: 443,
        agent: new https.Agent({
          ca: getCaCertificate(),
          checkServerIdentity: (_hostname, peerCertificate) => checkBridgeIdentity(peerCertificate, bridgeId),
        }),
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

export function getBridgeIdFromCertificate(ipAddress: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = connect(
      {
        host: ipAddress,
        port: 443,
        ca: getCaCertificate(),
        // The ID is what this reads, so there is nothing to check it against. The ca option still checks the chain.
        checkServerIdentity: () => undefined,
      },
      () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();
        resolve(getCommonName(cert));
      },
    );

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
 * A certificate's Common Name (CN) may be a string, an array of strings, or undefined.
 * The Hue Bridge certificate always uses a single CN, so it is normalized to a string.
 */
function getCommonName(certificate: PeerCertificate): string {
  const commonName = certificate.subject.CN;
  return Array.isArray(commonName) ? (commonName[0] ?? "") : (commonName ?? "");
}

/**
 * The bridge certificate's subject Common Name is the bridge ID, so this replaces Node's hostname check, as Signify's
 * "Using HTTPS" guide describes. The ca option already checks the chain against the bundled root certificates.
 * Returns the error like tls.checkServerIdentity does: a thrown error is uncaught and the connection carries on.
 * https://developers.meethue.com/develop/application-design-guidance/using-https/#Common%20name%20validation
 */
export function checkBridgeIdentity(certificate: PeerCertificate, bridgeId: string): Error | undefined {
  if (getCommonName(certificate).toLowerCase() !== bridgeId.toLowerCase()) {
    return new Error("Server identity check failed. Certificate subject’s Common Name does not match the Bridge ID.");
  }
}

let _caCertificate: Buffer | null = null;

export function getCaCertificate(): Buffer {
  if (_caCertificate) return _caCertificate;

  _caCertificate = fs.readFileSync(environment.assetsPath + "/huebridge_cacert.pem");

  return _caCertificate;
}
