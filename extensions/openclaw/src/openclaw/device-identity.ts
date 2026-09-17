import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomUUID,
  sign,
} from "node:crypto";
import { LocalStorage } from "@raycast/api";

export type DeviceIdentity = {
  deviceId: string;
  privateKeyPem: string;
  publicKeyPem: string;
};

export type DeviceAuthTokenRecord = {
  token: string;
  scopes: string[];
};

const IDENTITY_STORAGE_KEY = "openclaw.gateway.device-identity.v1";
const INSTANCE_ID_STORAGE_KEY = "openclaw.gateway.instance-id.v1";

export async function loadOrCreateInstanceId(): Promise<string> {
  const stored = await LocalStorage.getItem<string>(INSTANCE_ID_STORAGE_KEY);
  if (stored) return stored;

  const instanceId = randomUUID();
  await LocalStorage.setItem(INSTANCE_ID_STORAGE_KEY, instanceId);
  return instanceId;
}

function publicKeyBytes(publicKeyPem: string): Buffer {
  const key = createPublicKey(publicKeyPem);
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error("OpenClaw device key must use Ed25519.");
  }

  const der = key.export({
    format: "der",
    type: "spki",
  });

  if (der.length < 32) {
    throw new Error("OpenClaw device public key is invalid.");
  }

  return der.subarray(der.length - 32);
}

function isValidDeviceIdentity(value: unknown): value is DeviceIdentity {
  if (!value || typeof value !== "object") return false;
  const identity = value as Partial<DeviceIdentity>;
  if (
    typeof identity.deviceId !== "string" ||
    typeof identity.privateKeyPem !== "string" ||
    typeof identity.publicKeyPem !== "string"
  ) {
    return false;
  }

  try {
    const publicBytes = publicKeyBytes(identity.publicKeyPem);
    const derivedPublicKey = createPublicKey(
      createPrivateKey(identity.privateKeyPem),
    ).export({ format: "der", type: "spki" });
    const expectedDeviceId = createHash("sha256")
      .update(publicBytes)
      .digest("hex");
    return (
      expectedDeviceId === identity.deviceId &&
      derivedPublicKey.equals(
        createPublicKey(identity.publicKeyPem).export({
          format: "der",
          type: "spki",
        }),
      )
    );
  } catch {
    return false;
  }
}

function createDeviceIdentity(): DeviceIdentity {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({
    type: "spki",
    format: "pem",
  }) as string;
  const privateKeyPem = privateKey.export({
    type: "pkcs8",
    format: "pem",
  }) as string;

  return {
    deviceId: createHash("sha256")
      .update(publicKeyBytes(publicKeyPem))
      .digest("hex"),
    publicKeyPem,
    privateKeyPem,
  };
}

export async function loadOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const stored = await LocalStorage.getItem<string>(IDENTITY_STORAGE_KEY);

  if (stored) {
    try {
      const identity = JSON.parse(stored) as unknown;
      if (isValidDeviceIdentity(identity)) {
        return identity;
      }
    } catch {
      // Replace corrupt local state with a fresh identity.
    }
  }

  const identity = createDeviceIdentity();
  await LocalStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity));
  return identity;
}

function deviceTokenStorageKey(gatewayUrl: string, role: string): string {
  const parsed = new URL(gatewayUrl);
  const path = parsed.pathname.replace(/\/+$/, "");
  const scope = createHash("sha256")
    .update(`${parsed.origin}${path}:${role}`)
    .digest("hex")
    .slice(0, 24);
  return `openclaw.gateway.device-token.v1.${scope}`;
}

export async function loadDeviceAuthToken(
  gatewayUrl: string,
  role: string,
): Promise<DeviceAuthTokenRecord | null> {
  const stored = await LocalStorage.getItem<string>(
    deviceTokenStorageKey(gatewayUrl, role),
  );
  if (!stored) return null;

  try {
    const record = JSON.parse(stored) as Partial<DeviceAuthTokenRecord>;
    return typeof record.token === "string"
      ? {
          token: record.token,
          scopes: Array.isArray(record.scopes) ? record.scopes : [],
        }
      : null;
  } catch {
    return null;
  }
}

export async function storeDeviceAuthToken(
  gatewayUrl: string,
  role: string,
  record: DeviceAuthTokenRecord,
): Promise<void> {
  await LocalStorage.setItem(
    deviceTokenStorageKey(gatewayUrl, role),
    JSON.stringify(record),
  );
}

export async function clearDeviceAuthToken(
  gatewayUrl: string,
  role: string,
): Promise<void> {
  await LocalStorage.removeItem(deviceTokenStorageKey(gatewayUrl, role));
}

export function signDevicePayload(
  privateKeyPem: string,
  payload: string,
): string {
  return sign(null, Buffer.from(payload, "utf8"), privateKeyPem).toString(
    "base64url",
  );
}

export function publicKeyRawBase64UrlFromPem(publicKeyPem: string): string {
  return publicKeyBytes(publicKeyPem).toString("base64url");
}
