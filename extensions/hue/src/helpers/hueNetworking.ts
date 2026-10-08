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
 */
export async function discoverBridgeUsingHuePublicApi(): Promise<{ ipAddress: string; id: string }> {
  console.info("Discovering bridge using MeetHue's public API…");

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "discovery.meethue.com",
      path: "/",
      method: "GET",
      timeout: CONNECTION_TIMEOUT_MS,
    };

    const request = https.request(options, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        if (response.statusCode !== 200) {
          return reject(new Error(`Unexpected status code from MeetHue's public API: ${response.statusCode}`));
        }

        if (data === "") {
          return reject(new Error("Could not find a Hue Bridge using MeetHue's public API"));
        }

        const hueApiResults: HueApiService[] = JSON.parse(data);

        if (hueApiResults.length === 0) {
          return reject(new Error("Could not find a Hue Bridge using MeetHue's public API"));
        }

        const ipAddress = hueApiResults[0].internalipaddress;
        const id = hueApiResults[0].id;

        console.info(`Discovered Hue Bridge using MeetHue's public API: ${ipAddress}, ${id}`);
        return resolve({ ipAddress, id });
      });
    });

    request.on("timeout", () => {
      request.destroy();
      return reject(new Error("Timed out finding a Hue Bridge using MeetHue's public API"));
    });

    request.on("error", (error) => {
      return reject(new Error(`Could not find a Hue Bridge using MeetHue's public API ${error.message}`));
    });

    request.end();
  });
}

/**
 * Ignoring that there could be more than one Hue Bridge on a network as this is rare.
 */
export async function discoverBridgeUsingMdns(): Promise<{ ipAddress: string; id: string }> {
  console.info("Discovering bridge using mDNS…");

  return new Promise((resolve, reject) => {
    const browser = new Bonjour().findOne({ type: "hue", protocol: "tcp" });

    browser.on("up", (service) => {
      const ipAddress = service.addresses?.find((address) => isIPv4(address));
      const id = service.txt?.bridgeid;

      console.info(`Discovered Hue Bridge using mDNS: ${ipAddress}, ${id}`);
      return ipAddress ? resolve({ ipAddress, id }) : reject(new Error("Could not find a Hue Bridge using mDNS"));
    });

    browser.on("down", () => {
      return reject(new Error("Could not find a Hue Bridge using mDNS"));
    });

    setTimeout(() => {
      browser.stop();
      return reject(new Error("Could not find a Hue Bridge using mDNS"));
    }, 10000);
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
