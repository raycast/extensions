import type { ParsedOtpAuth } from "./types";
import { normalizeBase32Secret, normalizeNewAccountInput } from "./account-validation";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Uint8Array {
  const cleaned = normalizeBase32Secret(input);
  if (!cleaned) throw new Error("Invalid Base32 secret");
  const bits: number[] = [];

  for (const char of cleaned) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) throw new Error("Invalid Base32 secret");
    for (let i = 4; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bits[i * 8 + j] ?? 0);
    }
    bytes[i] = byte;
  }

  return bytes;
}

function intToBytes(num: number): Uint8Array {
  if (!Number.isSafeInteger(num) || num < 0) throw new Error("Invalid HOTP counter");
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = num & 0xff;
    num = Math.floor(num / 256);
  }
  return bytes;
}

async function hmac(
  algorithm: string,
  key: Uint8Array,
  data: Uint8Array,
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

function dynamicTruncate(hmacResult: Uint8Array, digits: number): string {
  if (digits !== 6 && digits !== 8) throw new Error("Unsupported OTP digits");
  const offset = hmacResult[hmacResult.length - 1]! & 0x0f;
  const code =
    ((hmacResult[offset]! & 0x7f) << 24) |
    ((hmacResult[offset + 1]! & 0xff) << 16) |
    ((hmacResult[offset + 2]! & 0xff) << 8) |
    (hmacResult[offset + 3]! & 0xff);

  return (code % Math.pow(10, digits)).toString().padStart(digits, "0");
}

export async function generateHOTP(
  secret: string,
  counter: number,
  digits: number = 6,
  algorithm: string = "SHA-1",
): Promise<string> {
  const key = base32Decode(secret);
  const data = intToBytes(counter);
  const hash = await hmac(algorithm, key, data);
  return dynamicTruncate(hash, digits);
}

export async function generateTOTP(
  secret: string,
  period: number = 30,
  digits: number = 6,
  algorithm: string = "SHA-1",
): Promise<{ code: string; remaining: number }> {
  if (!Number.isSafeInteger(period) || period < 1 || period > 300) {
    throw new Error("Invalid TOTP period");
  }
  const now = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(now / period);
  const remaining = period - (now % period);
  const code = await generateHOTP(secret, timeStep, digits, algorithm);
  return { code, remaining };
}

export function formatCode(code: string): string {
  if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`;
  if (code.length === 8)
    return `${code.slice(0, 4)} ${code.slice(4)}`;
  return code;
}

export function parseOtpAuthUri(uri: string): ParsedOtpAuth | null {
  try {
    const trimmed = uri.trim();
    if (!trimmed.startsWith("otpauth://")) return null;

    // Manual parsing to avoid URL constructor mishandling @ in labels.
    // Format: otpauth://TYPE/LABEL?PARAMS
    const withoutScheme = trimmed.slice("otpauth://".length);
    const slashIdx = withoutScheme.indexOf("/");
    if (slashIdx === -1) return null;

    const type = withoutScheme.slice(0, slashIdx).toLowerCase();
    if (type !== "totp" && type !== "hotp") return null;

    const rest = withoutScheme.slice(slashIdx + 1);
    const qIdx = rest.indexOf("?");
    const rawLabel = qIdx === -1 ? rest : rest.slice(0, qIdx);
    const queryStr = qIdx === -1 ? "" : rest.slice(qIdx + 1);

    const pathLabel = decodeURIComponent(rawLabel);
    let issuer = "";
    let name = pathLabel;

    if (pathLabel.includes(":")) {
      const colonIdx = pathLabel.indexOf(":");
      issuer = pathLabel.slice(0, colonIdx).trim();
      name = pathLabel.slice(colonIdx + 1).trim();
    }

    const params = new URLSearchParams(queryStr);
    const secret = params.get("secret");
    if (!secret) return null;

    const paramIssuer = params.get("issuer")?.trim();
    if (paramIssuer) issuer = paramIssuer;
    if (!name && issuer) name = issuer;
    if (!name) name = "Unknown";

    const algParam = (params.get("algorithm") || "SHA1").toUpperCase();
    const algorithmMap: Record<string, "SHA-1" | "SHA-256" | "SHA-512"> = {
      SHA1: "SHA-1",
      "SHA-1": "SHA-1",
      SHA256: "SHA-256",
      "SHA-256": "SHA-256",
      SHA512: "SHA-512",
      "SHA-512": "SHA-512",
    };

    const normalized = normalizeNewAccountInput({
      name,
      issuer,
      secret,
      type: type as "totp" | "hotp",
      digits: params.get("digits") ?? 6,
      period: params.get("period") ?? 30,
      counter: params.get("counter") ?? 0,
      algorithm: algorithmMap[algParam] ?? algParam,
    });
    return normalized as ParsedOtpAuth | null;
  } catch {
    return null;
  }
}
