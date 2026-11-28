import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  scryptSync,
  sign,
} from "node:crypto";
import {
  DeviceIdentity,
  GatewayClientHostDeps,
} from "@openclaw/gateway-client";

export interface AgentStore {
  read(key: string): Promise<string | undefined>;
  write(key: string, value: string): Promise<void>;
}

interface VaultData {
  identity: DeviceIdentity;
  tokens: Record<string, { token: string; scopes: string[] }>;
}

export function newDeviceIdentity(): DeviceIdentity {
  const pair = generateKeyPairSync("ed25519");
  const publicKeyPem = pair.publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  return {
    deviceId: createHash("sha256")
      .update(rawPublicKey(publicKeyPem))
      .digest("hex"),
    publicKeyPem,
    privateKeyPem: pair.privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString(),
  };
}

export function rawPublicKey(pem: string): Buffer {
  const jwk = createPublicKey(pem).export({ format: "jwk" });
  if (!jwk.x) throw new Error("Invalid Ed25519 public key.");
  return Buffer.from(jwk.x, "base64url");
}

export function sealDeviceData(value: unknown, password: string): string {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    scryptSync(password, salt, 32),
    iv,
  );
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return JSON.stringify({
    version: 1,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: ciphertext.toString("base64"),
  });
}

export function openDeviceData(value: string, password: string): VaultData {
  const envelope = JSON.parse(value);
  if (envelope.version !== 1)
    throw new Error("Unsupported device vault version.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    scryptSync(password, Buffer.from(envelope.salt, "base64"), 32),
    Buffer.from(envelope.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const data = JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(envelope.data, "base64")),
      decipher.final(),
    ]).toString("utf8"),
  ) as VaultData;
  if (
    !data.identity?.deviceId ||
    !data.identity.privateKeyPem ||
    !data.tokens
  ) {
    throw new Error("Invalid device vault.");
  }
  return data;
}

export async function deviceHost(
  store: AgentStore,
  scope: string,
  password: string,
): Promise<{ deps: GatewayClientHostDeps; flush: () => Promise<void> }> {
  if (!password)
    throw new Error(
      "Set the OpenClaw gateway token/password in Pocket AI's password preferences.",
    );
  const key = `pocket-ai.agent-device.v1:${scope}`;
  const stored = await store.read(key);
  const data = stored
    ? openDeviceData(stored, password)
    : ({ identity: newDeviceIdentity(), tokens: {} } as VaultData);
  let pending = Promise.resolve();
  function persist() {
    const sealed = sealDeviceData(data, password);
    pending = pending.then(() => store.write(key, sealed));
    // Keep rejection observable through flush without an unhandled promise rejection.
    void pending.catch(() => undefined);
  }
  if (!stored) {
    persist();
    await pending;
  }
  return {
    deps: {
      loadOrCreateDeviceIdentity: () => data.identity,
      publicKeyRawBase64UrlFromPem: (pem) =>
        rawPublicKey(pem).toString("base64url"),
      signDevicePayload: (pem, payload) =>
        sign(null, Buffer.from(payload), pem).toString("base64url"),
      loadDeviceAuthToken: ({ deviceId, role }) =>
        data.tokens[`${deviceId}:${role}`] || null,
      storeDeviceAuthToken: ({ deviceId, role, token, scopes }) => {
        data.tokens[`${deviceId}:${role}`] = { token, scopes };
        persist();
      },
      clearDeviceAuthToken: ({ deviceId, role }) => {
        delete data.tokens[`${deviceId}:${role}`];
        persist();
      },
      // The reference client's host logging is deliberately not forwarded.
      logDebug: () => undefined,
      logError: () => undefined,
    },
    flush: () => pending,
  };
}
