import {
  createPrivateKey,
  createPublicKey,
  randomUUID,
  sign,
  verify,
} from "node:crypto";

const LICENSE_PREFIX = "CLOAK-";
const LICENSE_VERSION = 1;
const LICENSE_PUBLIC_KEY =
  "MCowBQYDK2VwAyEAmMcjuITSXribL5UIPy31RLPu4Dwix18KbX01WcQRLp4=";

export type License = {
  version: number;
  id: string;
  email: string;
  issuedAt: string;
};

/**
 * Returns the license encoded in a key when its signature is valid.
 *
 * Keys are verified offline so redaction keeps working without a network
 * connection once a Mac has been unlocked.
 */
export function parseLicenseKey(
  key: string,
  publicKey = LICENSE_PUBLIC_KEY,
): License | undefined {
  const trimmed = key.trim();
  if (!trimmed.startsWith(LICENSE_PREFIX)) return undefined;

  const parts = trimmed.slice(LICENSE_PREFIX.length).split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return undefined;
  const [payload, signature] = parts;

  try {
    const signed = verify(
      null,
      Buffer.from(payload),
      createPublicKey({
        key: Buffer.from(publicKey, "base64"),
        format: "der",
        type: "spki",
      }),
      Buffer.from(signature, "base64url"),
    );
    if (!signed) return undefined;
    return asLicense(JSON.parse(Buffer.from(payload, "base64url").toString()));
  } catch {
    return undefined;
  }
}

export function issueLicenseKey(
  email: string,
  privateKey: string,
  issuedAt = new Date(),
): string {
  const license: License = {
    version: LICENSE_VERSION,
    id: randomUUID(),
    email,
    issuedAt: issuedAt.toISOString(),
  };
  const payload = Buffer.from(JSON.stringify(license)).toString("base64url");
  const signature = sign(
    null,
    Buffer.from(payload),
    createPrivateKey({
      key: Buffer.from(privateKey, "base64"),
      format: "der",
      type: "pkcs8",
    }),
  ).toString("base64url");
  return `${LICENSE_PREFIX}${payload}.${signature}`;
}

function asLicense(value: unknown): License | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { version, id, email, issuedAt } = value as Record<string, unknown>;
  if (
    version !== LICENSE_VERSION ||
    typeof id !== "string" ||
    typeof email !== "string" ||
    typeof issuedAt !== "string"
  ) {
    return undefined;
  }
  return { version, id, email, issuedAt };
}
