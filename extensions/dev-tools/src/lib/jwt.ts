// JSON Web Token decoding and (on-demand) signature verification for the
// inspector. A JWT is `base64url(header).base64url(payload).base64url(signature)`,
// where the header and payload are JSON objects. Decoding is pure; verification is
// only ever run when the user explicitly asks for it (never automatically) and is
// built on Node's crypto. Network key resolution lives separately in `jwks.ts`.

import {
  type JsonWebKey,
  type KeyObject,
  X509Certificate,
  constants,
  createHmac,
  createPublicKey,
  createVerify,
  timingSafeEqual,
} from "node:crypto";

/** Base64URL-decode a single segment to bytes (tolerant of missing padding). */
export function base64urlDecode(segment: string): Buffer {
  const padded = segment.length % 4 === 0 ? segment : segment + "=".repeat(4 - (segment.length % 4));
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export type DecodedJwt = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  /** Header re-rendered as pretty JSON. */
  headerJson: string;
  /** Payload re-rendered as pretty JSON. */
  payloadJson: string;
  /** The exact `header.payload` string the signature is computed over. */
  signingInput: string;
  /** The raw base64url signature segment (empty for unsigned `none` tokens). */
  signature: string;
  /** Byte length of the decoded signature. */
  signatureBytes: number;
  /** The original encoded token, trimmed. */
  token: string;
};

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/** Decode one segment as a JSON object, throwing a segment-specific message. */
function decodeSegment(segment: string, what: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(base64urlDecode(segment).toString("utf8"));
  } catch {
    throw new Error(`The ${what} is not valid Base64URL-encoded JSON.`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`The ${what} is not a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

/** Split and decode a JWT into header/payload/signature. Throws on malformed input. */
export function decodeJwt(token: string): DecodedJwt {
  const trimmed = token.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 3) {
    throw new Error(`A JWT has 3 dot-separated parts, but this one has ${parts.length}.`);
  }
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = decodeSegment(headerPart, "header");
  const payload = decodeSegment(payloadPart, "payload");
  return {
    header,
    payload,
    headerJson: pretty(header),
    payloadJson: pretty(payload),
    signingInput: `${headerPart}.${payloadPart}`,
    signature: signaturePart,
    signatureBytes: base64urlDecode(signaturePart).length,
    token: trimmed,
  };
}

// --- signature verification --------------------------------------------------
// Verification is invoked only on explicit user request. `verifyWith*` are pure
// (given a key/secret); resolving a key from the token's URLs is in `jwks.ts`.

export type AlgFamily = "hmac" | "rsa" | "pss" | "ec" | "none" | "unknown";

/** Map each JWS algorithm to its digest; the size is shared across families. */
const VERIFY_HASH: Record<string, "sha256" | "sha384" | "sha512"> = {
  HS256: "sha256",
  HS384: "sha384",
  HS512: "sha512",
  RS256: "sha256",
  RS384: "sha384",
  RS512: "sha512",
  PS256: "sha256",
  PS384: "sha384",
  PS512: "sha512",
  ES256: "sha256",
  ES384: "sha384",
  ES512: "sha512",
};

export function algFamily(alg: string): AlgFamily {
  if (alg === "none") return "none";
  if (alg.startsWith("HS")) return "hmac";
  if (alg.startsWith("RS")) return "rsa";
  if (alg.startsWith("PS")) return "pss";
  if (alg.startsWith("ES")) return "ec";
  return "unknown";
}

/** The token's signature algorithm, taken from its header (`none` if absent). */
export function tokenAlg(decoded: DecodedJwt): string {
  return typeof decoded.header.alg === "string" ? decoded.header.alg : "none";
}

/** Build a public key from a JWK (e.g. one selected from a JWK Set). */
export function jwkToKey(jwk: JsonWebKey): KeyObject {
  return createPublicKey({ key: jwk, format: "jwk" });
}

/** Build a public key from a base64 (standard, DER) X.509 certificate, as carried in `x5c`. */
export function x5cToKey(base64Der: string): KeyObject {
  return new X509Certificate(Buffer.from(base64Der, "base64")).publicKey;
}

/** Build a public key from a PEM/DER X.509 certificate (e.g. fetched via `x5u`). */
export function certToKey(pemOrDer: string | Buffer): KeyObject {
  return new X509Certificate(pemOrDer).publicKey;
}

/** Build a public key from a PEM key (accepts a public or a private key). */
export function pemToKey(pem: string): KeyObject {
  return createPublicKey(pem);
}

/** Verify an asymmetric (RS/PS/ES) signature with a public key. Throws for other algorithms. */
export function verifyWithKey(decoded: DecodedJwt, key: KeyObject): boolean {
  const alg = tokenAlg(decoded);
  const family = algFamily(alg);
  const hash = VERIFY_HASH[alg];
  if (!hash || (family !== "rsa" && family !== "pss" && family !== "ec")) {
    throw new Error(`${alg} is not an asymmetric algorithm — a public key can't verify it.`);
  }
  const signature = base64urlDecode(decoded.signature);
  const verifier = createVerify(hash).update(decoded.signingInput);
  if (family === "rsa") return verifier.verify(key, signature);
  if (family === "pss") {
    return verifier.verify(
      { key, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: constants.RSA_PSS_SALTLEN_DIGEST },
      signature,
    );
  }
  // ECDSA: JWS uses the raw r‖s signature, not Node's default DER encoding.
  return verifier.verify({ key, dsaEncoding: "ieee-p1363" }, signature);
}

/** Verify an HMAC (HS*) signature with a shared secret. Throws for other algorithms. */
export function verifyWithSecret(decoded: DecodedJwt, secret: string, secretBase64 = false): boolean {
  const alg = tokenAlg(decoded);
  const hash = VERIFY_HASH[alg];
  if (algFamily(alg) !== "hmac" || !hash) {
    throw new Error(`${alg} is not an HMAC algorithm — a shared secret can't verify it.`);
  }
  const key = secretBase64 ? Buffer.from(secret, "base64") : Buffer.from(secret, "utf8");
  const expected = createHmac(hash, key).update(decoded.signingInput).digest();
  const signature = base64urlDecode(decoded.signature);
  // timingSafeEqual needs equal lengths; a length mismatch is already a mismatch.
  return expected.length === signature.length && timingSafeEqual(expected, signature);
}

// --- claims ------------------------------------------------------------------

type ClaimMeta = { label: string; description: string };

/** Registered payload claims (RFC 7519), in the order they're shown. */
export const STANDARD_PAYLOAD: Record<string, ClaimMeta> = {
  iss: { label: "Issuer", description: "Principal that issued the token (iss)." },
  sub: { label: "Subject", description: "Principal that is the subject of the token (sub)." },
  aud: { label: "Audience", description: "Recipients the token is intended for (aud)." },
  exp: { label: "Expiration", description: "Time after which the token is rejected (exp)." },
  nbf: { label: "Not Before", description: "Time before which the token is rejected (nbf)." },
  iat: { label: "Issued At", description: "Time at which the token was issued (iat)." },
  jti: { label: "JWT ID", description: "Unique identifier for the token (jti)." },
};

/** Registered JOSE header parameters (RFC 7515), in the order they're shown. */
export const STANDARD_HEADER: Record<string, ClaimMeta> = {
  alg: { label: "Algorithm", description: "Signature or encryption algorithm (alg)." },
  typ: { label: "Type", description: "Media type of the token, usually JWT (typ)." },
  cty: { label: "Content Type", description: "Content type of the payload (cty)." },
  kid: { label: "Key ID", description: "Identifier of the key used to sign (kid)." },
  jku: { label: "JWK Set URL", description: "URL of the signer's public key set (jku)." },
  jwk: { label: "JSON Web Key", description: "Public key that corresponds to the signing key (jwk)." },
  x5u: { label: "X.509 URL", description: "URL of the signer's X.509 certificate (x5u)." },
  x5c: { label: "X.509 Chain", description: "Signer's X.509 certificate chain (x5c)." },
  x5t: { label: "X.509 Thumbprint", description: "SHA-1 thumbprint of the signing certificate (x5t)." },
  crit: { label: "Critical", description: "Extensions that must be understood (crit)." },
};

export type ClaimTimeState = "expired" | "valid" | "future";

export type ClaimTime = {
  /** Epoch milliseconds. */
  ms: number;
  /** ISO 8601 in UTC, e.g. `2024-05-15T12:30:45Z`. */
  iso: string;
  /** Human-readable UTC, e.g. `2024-05-15 12:30:45 UTC`. */
  utc: string;
  /** Relative phrase, e.g. `2 months ago`. */
  relative: string;
  /** Validity — only for `exp`/`nbf`; absent for `iat` and generic timestamps. */
  state?: ClaimTimeState;
  /** True for the registered time claims (`exp`/`nbf`/`iat`), which display relatively. */
  semantic: boolean;
  /** Primary text: the relative phrase for semantic claims, the absolute UTC otherwise. */
  display: string;
  /** Hover text exposing the exact epoch value alongside the absolute UTC. */
  tooltip: string;
};

export type Claim = {
  key: string;
  /** Friendly label for registered claims, otherwise the raw key. */
  label: string;
  description?: string;
  isStandard: boolean;
  value: unknown;
  /** The value as a single-line string suitable for copying. */
  copyText: string;
  /** A short, single-line preview of the value. */
  preview: string;
  /** Present for numeric time claims (exp/nbf/iat). */
  time?: ClaimTime;
};

/** Registered time claims (RFC 7519 NumericDate). These display as a relative time. */
const SEMANTIC_TIME = new Set(["exp", "nbf", "iat"]);

// Plausible Unix-epoch windows for treating an arbitrary number as a timestamp:
// 2001-09-09 .. 2100-01-01, tested in seconds and (×1000) in milliseconds.
const SECONDS_MIN = 1_000_000_000;
const SECONDS_MAX = 4_102_444_800;

/** Decide whether a numeric claim value is a timestamp, and normalize it to epoch ms. */
function detectTime(key: string, value: unknown): { ms: number; semantic: boolean } | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (SEMANTIC_TIME.has(key)) return { ms: value * 1000, semantic: true }; // NumericDate is in seconds
  if (!Number.isInteger(value)) return null;
  if (value >= SECONDS_MIN && value <= SECONDS_MAX) return { ms: value * 1000, semantic: false };
  if (value >= SECONDS_MIN * 1000 && value <= SECONDS_MAX * 1000) return { ms: value, semantic: false };
  return null;
}

/** Humanize a signed millisecond delta, e.g. `in 3 days` / `2 hours ago`. */
function relative(deltaMs: number): string {
  const future = deltaMs >= 0;
  let amount = Math.abs(deltaMs) / 1000;
  const steps: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [30, "day"],
    [12, "month"],
    [Infinity, "year"],
  ];
  let unit = "second";
  for (const [size, name] of steps) {
    unit = name;
    if (amount < size) break;
    amount /= size;
  }
  const rounded = Math.round(amount);
  const label = `${rounded} ${unit}${rounded === 1 ? "" : "s"}`;
  return future ? `in ${label}` : `${label} ago`;
}

function buildTime(key: string, value: number, ms: number, semantic: boolean, nowMs: number): ClaimTime {
  const iso = new Date(ms).toISOString();
  const utc = iso.replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
  const rel = relative(ms - nowMs);
  let state: ClaimTimeState | undefined;
  if (key === "exp") state = ms < nowMs ? "expired" : "valid";
  else if (key === "nbf") state = ms > nowMs ? "future" : "valid";
  return {
    ms,
    iso,
    utc,
    relative: rel,
    state,
    semantic,
    // Registered claims read naturally as "how long ago / until"; an arbitrary
    // timestamp field reads more clearly as the absolute UTC instant.
    display: semantic ? rel : utc,
    tooltip: `Exact: ${value} · ${utc}`,
  };
}

function copyTextFor(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function previewFor(value: unknown): string {
  // JSON-parsed values always stringify to a string, so no undefined guard is needed.
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

function makeClaim(key: string, value: unknown, meta: ClaimMeta | undefined, nowMs: number): Claim {
  const detected = detectTime(key, value);
  const time = detected ? buildTime(key, value as number, detected.ms, detected.semantic, nowMs) : undefined;
  return {
    key,
    label: meta?.label ?? key,
    description: meta?.description,
    isStandard: meta !== undefined,
    value,
    copyText: copyTextFor(value),
    preview: time ? time.display : previewFor(value),
    time,
  };
}

/**
 * Build the ordered claim list for a header or payload object: registered claims
 * first (in their canonical order), then any custom claims in their original order.
 */
export function buildClaims(obj: Record<string, unknown>, section: "header" | "payload", nowMs: number): Claim[] {
  const dict = section === "payload" ? STANDARD_PAYLOAD : STANDARD_HEADER;
  const standard = Object.keys(dict).filter((key) => key in obj);
  const custom = Object.keys(obj).filter((key) => !(key in dict));
  return [...standard, ...custom].map((key) => makeClaim(key, obj[key], dict[key], nowMs));
}
