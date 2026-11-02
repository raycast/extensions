import { createPrivateKey, createPublicKey, generateKeyPairSync, KeyObject, randomBytes } from "node:crypto";
import * as jose from "jose";

export type TokenMode = "jwt" | "jws" | "jwe";
export type SecretEncoding = "utf8" | "base64" | "base64url" | "hex";

export const JWS_ALGORITHMS = [
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
  "EdDSA",
  "Ed25519",
] as const;

export const JWE_KEY_ALGORITHMS = [
  "dir",
  "A128KW",
  "A192KW",
  "A256KW",
  "A128GCMKW",
  "A192GCMKW",
  "A256GCMKW",
  "RSA-OAEP",
  "RSA-OAEP-256",
  "RSA-OAEP-384",
  "RSA-OAEP-512",
  "ECDH-ES",
  "ECDH-ES+A128KW",
  "ECDH-ES+A192KW",
  "ECDH-ES+A256KW",
  "PBES2-HS256+A128KW",
  "PBES2-HS384+A192KW",
  "PBES2-HS512+A256KW",
] as const;

export const JWE_CONTENT_ENCRYPTIONS = [
  "A128GCM",
  "A192GCM",
  "A256GCM",
  "A128CBC-HS256",
  "A192CBC-HS384",
  "A256CBC-HS512",
] as const;

export const SECRET_ENCODINGS: { value: SecretEncoding; title: string }[] = [
  { value: "utf8", title: "UTF-8 Text" },
  { value: "base64", title: "Base64" },
  { value: "base64url", title: "Base64URL" },
  { value: "hex", title: "Hex" },
];

const encoder = new TextEncoder();

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

export interface DecodedJws {
  kind: "jws";
  header: jose.ProtectedHeaderParameters;
  payloadText: string;
  /** Parsed payload when it is valid JSON. */
  payloadJson?: unknown;
  /** Set when the payload is a JSON object, i.e. a JWT claims set. */
  claims?: jose.JWTPayload;
  signature: string;
}

export interface DecodedJwe {
  kind: "jwe";
  header: jose.ProtectedHeaderParameters;
  encryptedKey: string;
  iv: string;
  ciphertext: string;
  tag: string;
}

export type DecodedToken = DecodedJws | DecodedJwe;

/** Trims whitespace, surrounding quotes and a leading "Bearer " prefix. */
export function cleanToken(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^bearer\s+/i, "")
    .replace(/\s+/g, "");
}

export function looksLikeToken(raw: string): boolean {
  const token = cleanToken(raw);
  if (!/^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]*){2}$|^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]*){4}$/.test(token)) return false;
  try {
    return typeof jose.decodeProtectedHeader(token).alg === "string";
  } catch {
    return false;
  }
}

export function decodeToken(raw: string): DecodedToken {
  const token = cleanToken(raw);
  const parts = token.split(".");
  if (parts.length !== 3 && parts.length !== 5) {
    throw new Error(`Expected 3 (JWS/JWT) or 5 (JWE) dot-separated parts, got ${parts.length}`);
  }

  let header: jose.ProtectedHeaderParameters;
  try {
    header = jose.decodeProtectedHeader(token);
  } catch {
    throw new Error("The token header is not valid Base64URL-encoded JSON");
  }

  if (parts.length === 5) {
    const [, encryptedKey, iv, ciphertext, tag] = parts;
    return { kind: "jwe", header, encryptedKey, iv, ciphertext, tag };
  }

  const payloadText = header.b64 === false ? parts[1] : decodeUtf8(Buffer.from(parts[1], "base64url"));
  const payloadJson = tryParseJson(payloadText);
  const claims = isPlainObject(payloadJson) ? (payloadJson as jose.JWTPayload) : undefined;
  return { kind: "jws", header, payloadText, payloadJson, claims, signature: parts[2] };
}

export function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return `(binary, base64url) ${Buffer.from(bytes).toString("base64url")}`;
  }
}

export function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export type ClaimsStatus = "valid" | "expired" | "not-yet-valid" | "no-expiry";

export function claimsStatus(claims: jose.JWTPayload, now: Date = new Date()): ClaimsStatus {
  const nowSec = now.getTime() / 1000;
  if (typeof claims.nbf === "number" && claims.nbf > nowSec) return "not-yet-valid";
  if (typeof claims.exp === "number") return claims.exp <= nowSec ? "expired" : "valid";
  return "no-expiry";
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

type KeyUse = "verify" | "sign" | "encrypt" | "decrypt";
type Jwk = jose.JWK & Record<string, unknown>;

export function decodeSecret(raw: string, encoding: SecretEncoding): Uint8Array {
  const input = raw.trim();
  switch (encoding) {
    case "utf8":
      return encoder.encode(input);
    case "hex":
      if (!/^([0-9a-f]{2})+$/i.test(input)) throw new Error("Secret is not valid hex");
      return new Uint8Array(Buffer.from(input, "hex"));
    case "base64":
    case "base64url":
      if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(input)) throw new Error(`Secret is not valid ${encoding}`);
      return new Uint8Array(Buffer.from(input, encoding));
  }
}

function isPrivateUse(use: KeyUse): boolean {
  return use === "sign" || use === "decrypt";
}

function toKeyObject(material: string | Jwk, use: KeyUse): KeyObject {
  try {
    if (typeof material === "string") return isPrivateUse(use) ? createPrivateKey(material) : createPublicKey(material);
    const input = { key: material as unknown as import("node:crypto").JsonWebKey, format: "jwk" as const };
    return isPrivateUse(use) ? createPrivateKey(input) : createPublicKey(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      isPrivateUse(use) ? `A private key is required to ${use} (${message})` : `Invalid key (${message})`,
    );
  }
}

function jwkToKey(jwk: Jwk, use: KeyUse): jose.KeyInput {
  if (jwk.kty === "oct") {
    if (typeof jwk.k !== "string") throw new Error('Symmetric JWK is missing "k"');
    return new Uint8Array(Buffer.from(jwk.k, "base64url"));
  }
  return toKeyObject(jwk, use);
}

function parseJsonKey(input: string): Jwk | { keys: Jwk[] } {
  const json = tryParseJson(input);
  if (!isPlainObject(json)) throw new Error("Key looks like JSON but is not a valid JWK or JWKS object");
  return json as Jwk | { keys: Jwk[] };
}

function isJwks(value: Jwk | { keys: Jwk[] }): value is { keys: Jwk[] } {
  return Array.isArray((value as { keys?: unknown }).keys);
}

/** Returns the key material or throws a friendly error if no key was provided. */
function requireKey(raw: string): string {
  const input = raw.trim();
  if (!input) throw new Error("A key or secret is required");
  return input;
}

function resolveStaticKey(raw: string, use: KeyUse, encoding: SecretEncoding): jose.KeyInput {
  const input = requireKey(raw);
  if (input.startsWith("{")) {
    const json = parseJsonKey(input);
    if (isJwks(json)) {
      const candidate = isPrivateUse(use) ? json.keys.find((k) => k.d !== undefined || k.kty === "oct") : json.keys[0];
      if (!candidate) throw new Error("No usable key found in the JWKS");
      return jwkToKey(candidate, use);
    }
    return jwkToKey(json, use);
  }
  if (input.includes("-----BEGIN")) return toKeyObject(input, use);
  return decodeSecret(input, encoding);
}

export type VerifyKey = jose.KeyInput | jose.JWTVerifyGetKey;

/** Accepts a shared secret, PEM (public/private key or X.509 certificate), JWK, JWKS JSON or a JWKS URL. */
export function resolveVerifyKey(raw: string, encoding: SecretEncoding): VerifyKey {
  const input = requireKey(raw);
  if (/^https?:\/\//i.test(input)) return jose.createRemoteJWKSet(new URL(input));
  if (input.startsWith("{")) {
    const json = parseJsonKey(input);
    if (isJwks(json)) return jose.createLocalJWKSet(json as jose.JSONWebKeySet);
  }
  return resolveStaticKey(input, "verify", encoding);
}

export function resolveSignKey(raw: string, encoding: SecretEncoding): jose.KeyInput {
  return resolveStaticKey(raw, "sign", encoding);
}

export function resolveEncryptKey(raw: string, encoding: SecretEncoding): jose.KeyInput {
  return resolveStaticKey(raw, "encrypt", encoding);
}

export type DecryptKey = jose.KeyInput | ((header: jose.CompactJWEHeaderParameters) => jose.KeyInput);

export function resolveDecryptKey(raw: string, encoding: SecretEncoding): DecryptKey {
  const input = requireKey(raw);
  if (input.startsWith("{")) {
    const json = parseJsonKey(input);
    if (isJwks(json)) {
      return (header) => {
        const usable = json.keys.filter((k) => k.d !== undefined || k.kty === "oct");
        const match = (header.kid && usable.find((k) => k.kid === header.kid)) || usable[0];
        if (!match) throw new Error("No usable decryption key found in the JWKS");
        return jwkToKey(match, "decrypt");
      };
    }
  }
  return resolveStaticKey(input, "decrypt", encoding);
}

// ---------------------------------------------------------------------------
// JWS / JWT
// ---------------------------------------------------------------------------

export interface VerifyOutcome {
  signatureValid: boolean;
  /** Only set when claims were validated. */
  claimsValid?: boolean;
  message: string;
}

export async function verifyToken(
  rawToken: string,
  rawKey: string,
  options: { encoding: SecretEncoding; validateClaims: boolean },
): Promise<VerifyOutcome> {
  const token = cleanToken(rawToken);
  const decoded = decodeToken(token);
  if (decoded.kind !== "jws") throw new Error("This is a JWE (encrypted) token. Decrypt it instead of verifying.");
  if (decoded.header.alg === "none") {
    return { signatureValid: false, message: "Token is unsecured (alg: none); there is no signature to verify" };
  }

  const key = resolveVerifyKey(rawKey, options.encoding);
  try {
    if (options.validateClaims) {
      await jose.jwtVerify(token, key);
      return { signatureValid: true, claimsValid: true, message: "Signature verified and claims are valid" };
    }
    await jose.compactVerify(token, key as jose.KeyInput | jose.CompactVerifyGetKey);
    return { signatureValid: true, message: "Signature verified" };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ERR_JWT_CLAIM_VALIDATION_FAILED" || code === "ERR_JWT_EXPIRED" || code === "ERR_JWT_INVALID") {
      return {
        signatureValid: true,
        claimsValid: false,
        message: `Signature verified, but claims are invalid: ${(error as Error).message}`,
      };
    }
    if (code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED")
      return { signatureValid: false, message: "Invalid signature" };
    throw error;
  }
}

export async function signToken(input: {
  alg: string;
  header: Record<string, unknown>;
  payload: string | Uint8Array;
  key: string;
  encoding: SecretEncoding;
}): Promise<string> {
  const key = resolveSignKey(input.key, input.encoding);
  const payload = typeof input.payload === "string" ? encoder.encode(input.payload) : input.payload;
  return new jose.CompactSign(payload).setProtectedHeader({ ...input.header, alg: input.alg }).sign(key);
}

// ---------------------------------------------------------------------------
// JWE
// ---------------------------------------------------------------------------

export async function encryptToken(input: {
  alg: string;
  enc: string;
  header: Record<string, unknown>;
  plaintext: string;
  key: string;
  encoding: SecretEncoding;
}): Promise<string> {
  const key = resolveEncryptKey(input.key, input.encoding);
  return new jose.CompactEncrypt(encoder.encode(input.plaintext))
    .setProtectedHeader({ ...input.header, alg: input.alg, enc: input.enc })
    .encrypt(key);
}

export interface DecryptOutcome {
  header: jose.CompactJWEHeaderParameters;
  plaintext: string;
  json?: unknown;
  /** Set when the plaintext is itself a compact JWS/JWE (nested token). */
  nestedToken?: string;
}

export async function decryptToken(
  rawToken: string,
  rawKey: string,
  encoding: SecretEncoding,
): Promise<DecryptOutcome> {
  const token = cleanToken(rawToken);
  if (decodeToken(token).kind !== "jwe") throw new Error("This is a JWS/JWT (signed) token, not a JWE");
  const key = resolveDecryptKey(rawKey, encoding);
  const { plaintext, protectedHeader } = await jose.compactDecrypt(token, key as jose.KeyInput, {
    keyManagementAlgorithms: [...JWE_KEY_ALGORITHMS],
  });
  const text = decodeUtf8(plaintext);
  return {
    header: protectedHeader,
    plaintext: text,
    json: tryParseJson(text),
    nestedToken: looksLikeToken(text) ? cleanToken(text) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

export interface GeneratedKey {
  /** Value for the key field of the form. */
  key: string;
  encoding: SecretEncoding;
  /** The other half of an asymmetric key pair. */
  companion?: { title: string; value: string };
}

const SYMMETRIC_KEY_BYTES: Record<string, number> = {
  HS256: 32,
  HS384: 48,
  HS512: 64,
  A128KW: 16,
  A192KW: 24,
  A256KW: 32,
  A128GCMKW: 16,
  A192GCMKW: 24,
  A256GCMKW: 32,
  A128GCM: 16,
  A192GCM: 24,
  A256GCM: 32,
  "A128CBC-HS256": 32,
  "A192CBC-HS384": 48,
  "A256CBC-HS512": 64,
};

function generatePair(alg: string): { privateKey: string; publicKey: string } {
  const pem = {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  };
  if (/^(RS|PS)\d+$|^RSA-OAEP/.test(alg)) return generateKeyPairSync("rsa", { modulusLength: 2048, ...pem } as never);
  if (alg === "EdDSA" || alg === "Ed25519") return generateKeyPairSync("ed25519", pem as never);
  const namedCurve = alg === "ES384" ? "P-384" : alg === "ES512" ? "P-521" : "P-256";
  return generateKeyPairSync("ec", { namedCurve, ...pem } as never);
}

/** Generates a key suitable for `alg` (and `enc` for JWE "dir"). */
export function generateKey(alg: string, use: "sign" | "encrypt", enc?: string): GeneratedKey {
  if (alg.startsWith("PBES2")) return { key: randomBytes(24).toString("base64url"), encoding: "utf8" };

  const bytes = alg === "dir" ? SYMMETRIC_KEY_BYTES[enc ?? ""] : SYMMETRIC_KEY_BYTES[alg];
  if (bytes) return { key: randomBytes(bytes).toString("base64url"), encoding: "base64url" };

  const { privateKey, publicKey } = generatePair(alg);
  return use === "sign"
    ? { key: privateKey, encoding: "utf8", companion: { title: "Public Key (for verification)", value: publicKey } }
    : { key: publicKey, encoding: "utf8", companion: { title: "Private Key (for decryption)", value: privateKey } };
}
