import { SignJWT, jwtVerify, decodeJwt, decodeProtectedHeader, importPKCS8, importSPKI } from "jose";

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
}

async function signingKey(alg: string, keys: KeyMaterial) {
  if (isHmac(alg)) return hmacKey(keys.secret, keys.secretBase64);
  return importPKCS8(keys.privatePem, alg);
}

async function verificationKey(alg: string, keys: KeyMaterial) {
  if (isHmac(alg)) return hmacKey(keys.secret, keys.secretBase64);
  return importSPKI(keys.publicPem, alg);
}

/** Re-signs a token from an edited header/payload. `alg` (from the dropdown) wins over the header's `alg`. */
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
  if (isHmac(alg) ? !keys.secret : !keys.publicPem.trim()) return "unknown";
  try {
    const key = await verificationKey(alg, keys);
    await jwtVerify(token, key, { algorithms: [alg] });
    return "valid";
  } catch {
    return "invalid";
  }
}
