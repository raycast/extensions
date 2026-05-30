import { createHash, createHmac } from "node:crypto";
import type { OtpauthPayload, TotpAlgorithm, TotpDigits } from "./types";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function normalizeBase32(input: string): string {
  return input.toUpperCase().replace(/\s+/g, "").replace(/=+$/g, "");
}

export function decodeBase32(base32Input: string): Buffer {
  const base32 = normalizeBase32(base32Input);
  if (!base32) {
    throw new Error("Base32 secret is empty");
  }
  if (base32.length > 1024) {
    throw new Error("Base32 secret is too long");
  }
  if (!/^[A-Z2-7]+$/.test(base32)) {
    throw new Error("Base32 secret contains invalid characters");
  }

  let bits = "";
  for (const char of base32) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error("Base32 secret is invalid");
    }
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  if (bytes.length === 0) {
    throw new Error("Base32 secret does not produce valid bytes");
  }

  return Buffer.from(bytes);
}

function algorithmNodeName(
  algorithm: TotpAlgorithm,
): "sha1" | "sha256" | "sha512" {
  return algorithm.toLowerCase() as "sha1" | "sha256" | "sha512";
}

function hotp(
  secret: Buffer,
  counter: bigint,
  digits: TotpDigits,
  algorithm: TotpAlgorithm,
): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter, 0);

  const hmac = createHmac(algorithmNodeName(algorithm), secret)
    .update(counterBuffer)
    .digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 10 ** digits;
  return otp.toString().padStart(digits, "0");
}

export function generateTotpCode(params: {
  secretBase32: string;
  timestampMs?: number;
  digits?: TotpDigits;
  period?: number;
  algorithm?: TotpAlgorithm;
}): string {
  const {
    secretBase32,
    timestampMs = Date.now(),
    digits = 6,
    period = 30,
    algorithm = "SHA1",
  } = params;

  const secret = decodeBase32(secretBase32);
  const counter = BigInt(Math.floor(timestampMs / 1000 / period));
  return hotp(secret, counter, digits, algorithm);
}

export function secondsRemaining(
  period: number,
  timestampMs = Date.now(),
): number {
  const nowSec = Math.floor(timestampMs / 1000);
  return period - (nowSec % period);
}

function normalizeAlgorithm(input?: string): TotpAlgorithm {
  const value = (input ?? "SHA1").toUpperCase();
  if (value === "SHA1" || value === "SHA256" || value === "SHA512") {
    return value;
  }
  throw new Error("Unsupported algorithm. Use SHA1, SHA256 or SHA512");
}

function normalizeDigits(input?: string): TotpDigits {
  const parsed = Number(input ?? "6");
  if (parsed === 6 || parsed === 8) {
    return parsed;
  }
  throw new Error("Invalid digits. Use 6 or 8");
}

function normalizePeriod(input?: string): number {
  const parsed = Number(input ?? "30");
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 300) {
    throw new Error("Invalid period. Use an integer between 1 and 300");
  }
  return parsed;
}

const MAX_LABEL_FIELD_LENGTH = 256;

function capField(value: string, name: string): string {
  if (value.length > MAX_LABEL_FIELD_LENGTH) {
    throw new Error(`${name} exceeds ${MAX_LABEL_FIELD_LENGTH} characters`);
  }
  return value;
}

function parseLabel(pathname: string): {
  issuerFromLabel: string;
  account: string;
} {
  const raw = pathname.replace(/^\//, "");
  if (raw.length > MAX_LABEL_FIELD_LENGTH * 4) {
    throw new Error("Otpauth label is too long");
  }
  let label: string;
  try {
    label = decodeURIComponent(raw);
  } catch {
    throw new Error("Otpauth label has invalid URL encoding");
  }
  const [issuer, ...rest] = label.split(":");
  if (rest.length === 0) {
    return { issuerFromLabel: "", account: capField(issuer.trim(), "Account") };
  }
  return {
    issuerFromLabel: capField(issuer.trim(), "Issuer"),
    account: capField(rest.join(":").trim(), "Account"),
  };
}

export function parseOtpauthUrl(input: string): OtpauthPayload {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Invalid URL");
  }

  if (url.protocol !== "otpauth:") {
    throw new Error("URL must start with otpauth://");
  }
  if (url.hostname.toLowerCase() !== "totp") {
    throw new Error("Only otpauth://totp is supported");
  }

  const { issuerFromLabel, account } = parseLabel(url.pathname);
  const secretBase32 = normalizeBase32(url.searchParams.get("secret") ?? "");
  void decodeBase32(secretBase32);

  const issuerParam = capField(
    (url.searchParams.get("issuer") ?? "").trim(),
    "Issuer",
  );
  const issuer = issuerParam || issuerFromLabel;

  if (!issuer) {
    throw new Error("Missing issuer");
  }
  if (!account) {
    throw new Error("Missing account");
  }

  return {
    issuer,
    account,
    secretBase32,
    digits: normalizeDigits(url.searchParams.get("digits") ?? undefined),
    period: normalizePeriod(url.searchParams.get("period") ?? undefined),
    algorithm: normalizeAlgorithm(
      url.searchParams.get("algorithm") ?? undefined,
    ),
  };
}

export function stableAccountId(input: {
  issuer: string;
  account: string;
  secretBase32: string;
  digits: TotpDigits;
  period: number;
  algorithm: TotpAlgorithm;
}): string {
  return createHash("sha256")
    .update(
      `${input.issuer}\u0000${input.account}\u0000${input.secretBase32}\u0000${input.digits}\u0000${input.period}\u0000${input.algorithm}`,
    )
    .digest("hex")
    .slice(0, 24);
}
