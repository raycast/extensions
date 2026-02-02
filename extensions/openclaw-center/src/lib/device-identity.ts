import { LocalStorage } from "@raycast/api";
import * as crypto from "crypto";

const DEVICE_IDENTITY_KEY = "openclawd-device-identity";

// Ed25519 SPKI prefix for extracting raw public key
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

interface DeviceIdentity {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

let cachedIdentity: DeviceIdentity | null = null;

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function derivePublicKeyRaw(publicKeyPem: string): Buffer {
  const key = crypto.createPublicKey(publicKeyPem);
  const spki = key.export({ type: "spki", format: "der" }) as Buffer;
  if (
    spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
  ) {
    return spki.subarray(ED25519_SPKI_PREFIX.length);
  }
  return spki;
}

function fingerprintPublicKey(publicKeyPem: string): string {
  const raw = derivePublicKeyRaw(publicKeyPem);
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Get or create device identity for this Raycast installation.
 */
export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  if (cachedIdentity) {
    return cachedIdentity;
  }

  const stored = await LocalStorage.getItem<string>(DEVICE_IDENTITY_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as DeviceIdentity;
      if (parsed.deviceId && parsed.publicKeyPem && parsed.privateKeyPem) {
        cachedIdentity = parsed;
        return cachedIdentity;
      }
    } catch {
      // Corrupted, regenerate
    }
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({
    type: "spki",
    format: "pem",
  }) as string;
  const privateKeyPem = privateKey.export({
    type: "pkcs8",
    format: "pem",
  }) as string;
  const deviceId = fingerprintPublicKey(publicKeyPem);

  const identity: DeviceIdentity = { deviceId, publicKeyPem, privateKeyPem };
  await LocalStorage.setItem(DEVICE_IDENTITY_KEY, JSON.stringify(identity));
  cachedIdentity = identity;

  return identity;
}

/**
 * Get the raw public key as base64url for sending to gateway.
 */
export function getPublicKeyBase64Url(publicKeyPem: string): string {
  return base64UrlEncode(derivePublicKeyRaw(publicKeyPem));
}

/**
 * Build the device auth payload string (pipe-delimited format).
 */
export function buildDeviceAuthPayload(params: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token?: string | null;
  nonce?: string | null;
}): string {
  const version = params.nonce ? "v2" : "v1";
  const scopes = params.scopes.join(",");
  const token = params.token ?? "";
  const base = [
    version,
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    scopes,
    String(params.signedAtMs),
    token,
  ];
  if (version === "v2") {
    base.push(params.nonce ?? "");
  }
  return base.join("|");
}

/**
 * Sign the payload using Ed25519 private key.
 */
export function signPayload(privateKeyPem: string, payload: string): string {
  const key = crypto.createPrivateKey(privateKeyPem);
  const sig = crypto.sign(null, Buffer.from(payload, "utf8"), key);
  return base64UrlEncode(sig);
}

/**
 * Clear stored device identity (for debugging/reset).
 */
export async function clearDeviceIdentity(): Promise<void> {
  await LocalStorage.removeItem(DEVICE_IDENTITY_KEY);
  cachedIdentity = null;
}
