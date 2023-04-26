import { discovery, v3 } from "node-hue-api";
import { APP_NAME } from "./constants";
import tls from "tls";

/**
 * Ignoring that you could have more than one Hue Bridge on a network as this is unlikely in 99.9% of users situations
 */
export async function discoverBridgeUsingNupnp(): Promise<string> {
  console.info("Discovering bridge using MeetHue's public API…");
  const hueApiResults = await discovery.nupnpSearch();

  if (hueApiResults.length === 0) {
    throw new Error("Could not find a Hue Bridge using MeetHue's public API");
  }

  console.info("Discovered Hue Bridge using MeetHue's public API:", hueApiResults[0].ipaddress);

  return hueApiResults[0].ipaddress;
}

/**
 * Ignoring that you could have more than one Hue Bridge on a network as this is unlikely in 99.9% of users situations
 */
export async function discoverBridgeUsingMdns(): Promise<string> {
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

export async function getUsernameFromBridge(ipAddress: string): Promise<string> {
  // Create an unauthenticated instance of the Hue API so that we can create a new user
  const unauthenticatedApi = await v3.api.createLocal(ipAddress).connect();
  const createdUser = await unauthenticatedApi.users.createUser(APP_NAME, "");

  return createdUser.username;
}

export function getCertificate(host: string): Promise<tls.PeerCertificate> {
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
        resolve(socket.getPeerCertificate());
      }
    );

    socket.on("error", (error) => {
      reject(error);
    });
  });
}

export async function createPemString(cert: tls.PeerCertificate): Promise<string> {
  const insertNewlines = (str: string): string => {
    const regex = new RegExp(`(.{64})`, "g");
    return str.replace(regex, "$1\n");
  };
  const base64 = cert.raw.toString("base64");
  return `-----BEGIN CERTIFICATE-----\n${insertNewlines(base64)}\n-----END CERTIFICATE-----\n`;
}
