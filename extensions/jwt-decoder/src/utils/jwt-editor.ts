import { webcrypto } from "node:crypto";
import {
  SignJWT,
  jwtVerify,
  decodeJwt,
  decodeProtectedHeader,
  importPKCS8,
  importSPKI,
  createRemoteJWKSet,
} from "jose";

// jose v6 uses the Web Crypto API (`globalThis.crypto`), which Raycast's Node runtime
// does not expose by default. Polyfill it so signing/verification works.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
}

export const ALGORITHMS = [
  "HS256",
  "HS384",
  "HS512",
  "RS256",
  "RS384",
  "RS512",
  "PS256",
  "PS384",
  "PS512",
  "ES256",
  "ES384",
  "ES512",
  "none",
] as const;

export type Algorithm = (typeof ALGORITHMS)[number];

export function isHmac(alg: string): boolean {
  return alg.startsWith("HS");
}

export function isNone(alg: string): boolean {
  return alg === "none";
}

// Minimum HMAC key length (bytes) required per RFC 7518 / enforced by jose.
const HMAC_MIN_BYTES: Record<string, number> = { HS256: 32, HS384: 48, HS512: 64 };

/** Minimum key length in bytes for an HMAC algorithm (0 if not HMAC). */
export function hmacMinBytes(alg: string): number {
  return HMAC_MIN_BYTES[alg] ?? 0;
}

/** Byte length of the HMAC key derived from the secret and Base64 flag. */
export function hmacKeyBytes(secret: string, base64: boolean): number {
  return base64 ? Buffer.from(secret, "base64").length : new TextEncoder().encode(secret).length;
}

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/** A JWT is three base64url segments separated by dots (signature may be empty for `alg: none`). */
export function looksLikeJwt(value: string): boolean {
  return /^[\w-]+\.[\w-]+\.[\w-]*$/.test(value.trim());
}

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
}

/** Decodes header and payload without verifying. Throws on a malformed token. */
export function decode(token: string): DecodedJwt {
  const header = decodeProtectedHeader(token) as Record<string, unknown>;
  const payload = decodeJwt(token) as Record<string, unknown>;
  return { header, payload };
}

function hmacKey(secret: string, base64: boolean): Uint8Array {
  return base64 ? new Uint8Array(Buffer.from(secret, "base64")) : new TextEncoder().encode(secret);
}

export interface KeyMaterial {
  secret: string;
  secretBase64: boolean;
  privatePem: string;
  publicPem: string;
  useJwks: boolean;
  jwksUri: string;
}

// `jose` rejects PEMs with leading indentation/whitespace, which pasting easily introduces.
function normalizePem(pem: string): string {
  return pem
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

async function signingKey(alg: string, keys: KeyMaterial) {
  if (isHmac(alg)) return hmacKey(keys.secret, keys.secretBase64);
  return importPKCS8(normalizePem(keys.privatePem), alg);
}

/** (Re-)signs a token from the given header/payload with the provided algorithm and key. */
export async function sign(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  alg: Algorithm,
  keys: KeyMaterial,
): Promise<string> {
  // `jose` refuses `alg: none` for security, so build the unsecured token manually.
  if (isNone(alg)) {
    return `${base64url({ ...header, alg: "none" })}.${base64url(payload)}.`;
  }
  const key = await signingKey(alg, keys);
  return new SignJWT(payload).setProtectedHeader({ ...header, alg }).sign(key);
}

export type VerifyResult = "valid" | "invalid" | "unknown" | "unsigned";

/** Verifies the signature. "unsigned" for `alg: none`, "unknown" when no verification key is available. */
export async function verify(token: string, alg: Algorithm, keys: KeyMaterial): Promise<VerifyResult> {
  if (isNone(alg)) return "unsigned";

  if (isHmac(alg)) {
    if (!keys.secret) return "unknown";
    try {
      await jwtVerify(token, hmacKey(keys.secret, keys.secretBase64), { algorithms: [alg] });
      return "valid";
    } catch {
      return "invalid";
    }
  }

  // Asymmetric: verify against a remote JWKS endpoint or a PEM public key.
  try {
    if (keys.useJwks) {
      if (!keys.jwksUri.trim()) return "unknown";
      const jwks = createRemoteJWKSet(new URL(keys.jwksUri.trim()));
      await jwtVerify(token, jwks, { algorithms: [alg] });
    } else {
      if (!keys.publicPem.trim()) return "unknown";
      await jwtVerify(token, await importSPKI(normalizePem(keys.publicPem), alg), { algorithms: [alg] });
    }
    return "valid";
  } catch {
    return "invalid";
  }
}
