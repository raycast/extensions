import https from "https";
import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";
import { AuthResponse, BridgeDiscovery } from "./types";

// Load Hue Bridge root CA certificate for SSL verification
const HUE_ROOT_CA = fs.readFileSync(path.join(environment.assetsPath, "root_ca_cert.pem"));

const DISCOVERY_URL = "https://discovery.meethue.com";

export async function discoverBridges(): Promise<BridgeDiscovery[]> {
  const response = await fetch(DISCOVERY_URL);

  if (!response.ok) {
    throw new Error(`Failed to discover bridges: ${response.statusText}`);
  }

  return response.json() as Promise<BridgeDiscovery[]>;
}

export async function authenticate(
  bridgeIP: string,
  appName: string = "openhue-raycast",
  instanceName: string = "raycast",
): Promise<AuthResponse> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      devicetype: `${appName}#${instanceName}`,
      generateclientkey: true,
    });

    const options: https.RequestOptions = {
      hostname: bridgeIP,
      port: 443,
      path: "/api",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
      ca: HUE_ROOT_CA, // Use Philips Hue root CA for certificate verification
      rejectUnauthorized: true,
      // Hue bridge certs are issued to bridge ID, not IP - skip hostname verification
      checkServerIdentity: () => undefined,
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(data) as AuthResponse[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            resolve(parsed[0]);
          } else {
            reject(new Error("Unexpected authentication response format"));
          }
        } catch {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on("error", (e) => {
      reject(new Error(`Connection failed: ${e.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("Connection timeout"));
    });

    req.write(postData);
    req.end();
  });
}

export function isLinkButtonError(response: AuthResponse): boolean {
  return response.error?.type === 101;
}

export function getAuthError(response: AuthResponse): string | null {
  if (response.error) {
    return response.error.description;
  }
  return null;
}

export function getApplicationKey(response: AuthResponse): string | null {
  return response.success?.username ?? null;
}
