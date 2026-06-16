import { APP_NAME, CONNECTION_TIMEOUT_MS } from "./constants";
import * as tls from "tls";
import { PeerCertificate } from "tls";
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
          return reject(`Unexpected status code from MeetHue's public API: ${response.statusCode}`);
        }

        if (data === "") {
          return reject("Could not find a Hue Bridge using MeetHue's public API");
        }

        const hueApiResults: HueApiService[] = JSON.parse(data);

        if (hueApiResults.length === 0) {
          return reject("Could not find a Hue Bridge using MeetHue's public API");
        }

        const ipAddress = hueApiResults[0].internalipaddress;
        const id = hueApiResults[0].id;

        console.info(`Discovered Hue Bridge using MeetHue's public API: ${ipAddress}, ${id}`);
        return resolve({ ipAddress, id });
      });
    });

    request.on("timeout", () => {
      request.destroy();
      return reject("Timed out finding a Hue Bridge using MeetHue's public API");
    });

    request.on("error", (error) => {
      return reject(`Could not find a Hue Bridge using MeetHue's public API ${error.message}`);
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
      return ipAddress ? resolve({ ipAddress, id }) : reject("Could not find a Hue Bridge using mDNS");
    });

    browser.on("down", () => {
      return reject("Could not find a Hue Bridge using mDNS");
    });

    setTimeout(() => {
      browser.stop();
      return reject("Could not find a Hue Bridge using mDNS");
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
        agent: getBridgeHttpsAgent(bridgeId),
        timeout: CONNECTION_TIMEOUT_MS,
        headers: {
          "Content-Type": "application/json",
        },
      },
      (response) => {
        if (response.statusCode !== 200) {
          return reject(`Unexpected status code from Hue Bridge: ${response.statusCode}`);
        }

        response.on("data", (data) => {
          const response: LinkResponse = JSON.parse(data.toString())[0];
          if (response.error?.description) {
            const errorDescription = response.error.description;
            return reject(errorDescription.charAt(0).toUpperCase() + errorDescription.slice(1));
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
    const socket = tls.connect(
      {
        host: ipAddress,
        port: 443,
        ca: getCaCertificate(),
        checkServerIdentity: (_hostname, peerCertificate) => {
          if (peerCertificate.issuer.CN !== "root-bridge") {
            return new Error(
              "Server identity check failed. Certificate issuer's Common Name does not match the expected value.",
            );
          }
          return undefined;
        },
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

let _bridgeHttpsAgent: https.Agent | null = null;

/**
 * Creates a bridge-specific HTTPS agent that inherits the connection pooling and TLS
 * session resumption settings from our base agent.
 * @param bridgeId Bridge ID for certificate validation
 * @returns HTTPS agent configured for the specific Hue Bridge
 */
export function getBridgeHttpsAgent(bridgeId: string): https.Agent {
  if (_bridgeHttpsAgent) return _bridgeHttpsAgent;

  _bridgeHttpsAgent = new https.Agent({
    keepAlive: true,
    rejectUnauthorized: true,
    ca: getCaCertificate(),
    checkServerIdentity: (_hostname, peerCertificate) => validateBridgeCertificate(peerCertificate, bridgeId),
  });

  return _bridgeHttpsAgent;
}

/**
 * A certificate's Common Name (CN) may be a string, an array of strings, or undefined.
 * The Hue Bridge certificate always uses a single CN, so it is normalized to a string.
 */
export function getCommonName(certificate: PeerCertificate): string {
  const commonName = certificate.subject.CN;
  return Array.isArray(commonName) ? (commonName[0] ?? "") : (commonName ?? "");
}

/**
 * The Hue Bridge uses a certificate signed by a root-bridge certificate, or an intermediate certificate which will
 * be signed by a root-bridge certificate.
 * The CN (common name) of the certificate matches the ID of the Hue Bridge, which is a 16-character hex string.
 * The CN of a certificate signed by the Hue Bridge root certificate is 'root-bridge'.
 * https://developers.meethue.com/develop/application-design-guidance/using-https/#Common%20name%20validation
 * https://developers.meethue.com/develop/application-design-guidance/using-https/#Self-signed%20certificates
 */
function validateBridgeCertificate(peerCertificate: PeerCertificate, bridgeId: string) {
  if (getCommonName(peerCertificate).toLowerCase() !== bridgeId.toLowerCase()) {
    throw new Error("Server identity check failed. Certificate subject’s Common Name does not match the Bridge ID.");
  }

  if (peerCertificate.issuer.CN !== "root-bridge") {
    throw new Error(
      "Server identity check failed. Certificate issuer’s Common Name does not match the expected value.",
    );
  }

  // Return undefined to indicate that the server identity check succeeded
  return undefined;
}

let _caCertificate: Buffer | null = null;

export function getCaCertificate(): Buffer {
  if (_caCertificate) return _caCertificate;

  _caCertificate = fs.readFileSync(environment.assetsPath + "/huebridge_cacert.pem");

  return _caCertificate;
}
