import { createHmac } from "node:crypto";

export type TotpAlgorithm = "sha1" | "sha256" | "sha512";

export interface TotpParams {
  secret: Buffer;
  algorithm: TotpAlgorithm;
  digits: number;
  period: number;
}

export interface TotpCode {
  code: string;
  remainingSeconds: number;
  period: number;
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(input: string): Buffer | undefined {
  const normalized = input.replace(/[\s-]/g, "").replace(/=+$/, "").toUpperCase();
  if (!normalized) return undefined;

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) return undefined;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function parseAlgorithm(raw: string | null): TotpAlgorithm | undefined {
  if (raw === null) return "sha1";
  switch (raw.toUpperCase().replace("-", "")) {
    case "SHA1":
      return "sha1";
    case "SHA256":
      return "sha256";
    case "SHA512":
      return "sha512";
    default:
      return undefined;
  }
}

function parsePositiveInteger(raw: string | null, fallback: number): number | undefined {
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

/**
 * Parses an `otpauth://totp/...` URI, or a bare base32 secret with the default settings.
 * Returns undefined for anything that can't be computed locally (HOTP, Steam codes, invalid secrets),
 * so callers can fall back to `pass-cli item totp`.
 */
export function parseOtpauthUri(raw: string): TotpParams | undefined {
  const value = raw.trim();
  if (!value.toLowerCase().startsWith("otpauth://")) {
    const secret = base32Decode(value);
    return secret && secret.length > 0 ? { secret, algorithm: "sha1", digits: 6, period: 30 } : undefined;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.host.toLowerCase() !== "totp") return undefined;
  if (url.searchParams.get("encoder")?.toLowerCase() === "steam") return undefined;

  const secretParam = url.searchParams.get("secret");
  const secret = secretParam ? base32Decode(secretParam) : undefined;
  const algorithm = parseAlgorithm(url.searchParams.get("algorithm"));
  const digits = parsePositiveInteger(url.searchParams.get("digits"), 6);
  const period = parsePositiveInteger(url.searchParams.get("period"), 30);

  if (!secret || secret.length === 0 || !algorithm || !digits || digits < 6 || digits > 8 || !period) {
    return undefined;
  }
  return { secret, algorithm, digits, period };
}

/** RFC 6238 TOTP. */
export function generateTotp(params: TotpParams, nowMs: number = Date.now()): TotpCode {
  const seconds = Math.floor(nowMs / 1000);
  const counter = Math.floor(seconds / params.period);

  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac(params.algorithm, params.secret).update(counterBytes).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = String(binary % 10 ** params.digits).padStart(params.digits, "0");

  return { code, remainingSeconds: params.period - (seconds % params.period), period: params.period };
}
