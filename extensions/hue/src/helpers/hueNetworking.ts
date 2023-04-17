import { discovery } from "node-hue-api";
import { APP_NAME } from "./constants";
import tls, { PeerCertificate } from "tls";
import * as https from "https";
import { LinkResponse } from "../lib/types";

/**
 * Ignoring that you could have more than one Hue Bridge on a network as this is unlikely in 99.9% of users situations
 */
export async function discoverBridgeUsingNupnp(): Promise<string> {
  console.info("Discovering bridge using MeetHue's public API…");

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "discovery.meethue.com",
      path: "/",
      method: "GET",
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

        const hueApiResults = JSON.parse(data);

        if (hueApiResults.length === 0) {
          return reject("Could not find a Hue Bridge using MeetHue's public API");
        }

        const ipAddress = hueApiResults[0].ipaddress;
        console.info(`Discovered Hue Bridge using MeetHue's public API: ${ipAddress}`);
        return resolve(ipAddress);
      });
    });

    request.on("error", (error) => {
      return reject(`Could not find a Hue Bridge using MeetHue's public API ${error.message}`);
    });

    request.end();
  });
}

/**
 * Ignoring that you could have more than one Hue Bridge on a network as this is unlikely in 99.9% of users situations
 */
export async function discoverBridgeUsingMdns(): Promise<string> {
  // TODO: Remove dependency on node-hue-api
  console.info("Discovering bridge using mDNS…");

  const mDnsResults = await discovery.mdnsSearch(10_000); // 10 seconds
  if (mDnsResults.length === 0) {
    throw new Error("Could not find a Hue Bridge");
  }

  const ipAddress = mDnsResults[0].ipaddress;

  if (ipAddress === undefined) {
    throw new Error("Could not find a Hue Bridge");
  }

  console.info("Discovered Hue Bridge using mDNS:", ipAddress);
  return ipAddress;
}

function isValidBridgeCertificate(peerCertificate: PeerCertificate) {
  return (
    /^([0-9a-fA-F]){16}$/.test(peerCertificate.subject.CN) &&
    (peerCertificate.subject.CN === peerCertificate.issuer.CN || peerCertificate.issuer.CN === "root-bridge")
  );
}

export async function getUsernameFromBridge(ipAddress: string, certificate: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        method: "POST",
        path: "/api",
        hostname: ipAddress,
        port: 443,
        ca: certificate,
        agent: new https.Agent({
          checkServerIdentity: (hostname, peerCertificate) => {
            if (!isValidBridgeCertificate(peerCertificate)) {
              reject("TLS certificate is not a valid Hue Bridge certificate");
            }

            return undefined;
          },
        }),
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
      }
    );

    request.write(
      JSON.stringify({
        devicetype: APP_NAME,
        generateclientkey: true,
      })
    );

    request.end();
  });
}

export function getCertificate(host: string): Promise<PeerCertificate> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: host,
        port: 443,
        rejectUnauthorized: false,
      },
      () => {
        console.log("Getting certificate from the Hue Bridge…");
        socket.end();
        const peerCertificate: PeerCertificate = socket.getPeerCertificate();

        /*
         * The Hue Bridge uses either a self-signed certificate, or a certificate signed by a root-bridge certificate.
         * In both cases, the CN (common name) of the certificate is the ID of the Hue Bridge, which is a 16 character hex string.
         * The CN of a self-signed certificate is also the ID of the Hue Bridge.
         * The CN of a certificate signed by the Hue Bridge root certificate is 'root-bridge'.
         * https://developers.meethue.com/develop/application-design-guidance/using-https/#Common%20name%20validation
         * https://developers.meethue.com/develop/application-design-guidance/using-https/#Self-signed%20certificates
         */
        if (!isValidBridgeCertificate(peerCertificate)) {
          return reject("TLS certificate is not a valid Hue Bridge certificate");
        }

        return resolve(peerCertificate);
      }
    );

    socket.on("error", (error) => {
      return reject(error);
    });
  });
}

export function createPemString(cert: PeerCertificate): string {
  const insertNewlines = (str: string): string => {
    const regex = new RegExp(`(.{64})`, "g");
    return str.replace(regex, "$1\n");
  };
  const base64 = cert.raw.toString("base64");
  return `-----BEGIN CERTIFICATE-----\n${insertNewlines(base64)}\n-----END CERTIFICATE-----\n`;
}
