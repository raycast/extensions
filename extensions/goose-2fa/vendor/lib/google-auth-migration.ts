/**
 * Google Authenticator migration format decoder.
 *
 * URI: otpauth-migration://offline?data=BASE64_PROTOBUF
 *
 * Protobuf schema (MigrationPayload):
 *   field 1 (repeated, embedded): OtpParameters
 *
 * OtpParameters:
 *   field 1 (bytes):  secret
 *   field 2 (string): name
 *   field 3 (string): issuer
 *   field 4 (varint): algorithm  (0=unspecified/SHA1, 1=SHA1, 2=SHA256, 3=SHA512, 4=MD5)
 *   field 5 (varint): digits     (0=unspecified/6, 1=six, 2=eight)
 *   field 6 (varint): type       (0=unspecified/TOTP, 1=HOTP, 2=TOTP)
 *   field 7 (varint): counter
 */

import type { NewAccountInput } from "./types";
import { normalizeNewAccountInput } from "./account-validation";

// ---- protobuf primitives ----

function decodeVarint(buf: Uint8Array, offset: number): [bigint, number] {
  let result = 0n;
  let shift = 0n;
  let pos = offset;
  while (pos < buf.length) {
    const byte = buf[pos]!;
    result |= BigInt(byte & 0x7f) << shift;
    pos++;
    if (!(byte & 0x80)) return [result, pos];
    shift += 7n;
    if (shift > 63n) throw new Error("Varint exceeds 64 bits");
  }
  throw new Error("Truncated protobuf varint");
}

function safeNumber(value: bigint): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error("Unsafe protobuf integer");
  return number;
}

// ---- base32 encode raw bytes ----

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function bytesToBase32(bytes: Uint8Array): string {
  let result = "";
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += B32[(value >> bits) & 31];
    }
  }
  if (bits > 0) {
    result += B32[(value << (5 - bits)) & 31];
  }
  return result;
}

// ---- parse one OtpParameters message ----

function parseOtpEntry(buf: Uint8Array): NewAccountInput | null {
  let secret: Uint8Array | null = null;
  let name = "";
  let issuer = "";
  let algorithm = 0;
  let digits = 0;
  let otpType = 0;
  let counter = 0;

  let pos = 0;
  while (pos < buf.length) {
    const [tag, p1] = decodeVarint(buf, pos);
    pos = p1;
    const field = safeNumber(tag >> 3n);
    const wire = safeNumber(tag & 0x7n);

    if (wire === 2) {
      const [len, p2] = decodeVarint(buf, pos);
      pos = p2;
      const size = safeNumber(len);
      if (size > buf.length - pos) throw new Error("Truncated protobuf field");
      const data = buf.slice(pos, pos + size);
      pos += size;
      if (field === 1) secret = data;
      else if (field === 2) name = new TextDecoder().decode(data);
      else if (field === 3) issuer = new TextDecoder().decode(data);
    } else if (wire === 0) {
      const [val, p2] = decodeVarint(buf, pos);
      pos = p2;
      const number = safeNumber(val);
      if (field === 4) algorithm = number;
      else if (field === 5) digits = number;
      else if (field === 6) otpType = number;
      else if (field === 7) counter = number;
    } else {
      // skip unknown wire types
      if (wire === 1) pos += 8;
      else if (wire === 5) pos += 4;
      else break;
      if (pos > buf.length) throw new Error("Truncated protobuf field");
    }
  }

  if (!secret || secret.length === 0) return null;

  const algMap: Record<number, "SHA-1" | "SHA-256" | "SHA-512"> = {
    0: "SHA-1",
    1: "SHA-1",
    2: "SHA-256",
    3: "SHA-512",
  };
  const digitMap: Record<number, number> = { 0: 6, 1: 6, 2: 8 };
  const typeMap: Record<number, "totp" | "hotp"> = { 0: "totp", 1: "hotp", 2: "totp" };

  // Handle label format "Issuer:account" when issuer is empty
  if (!issuer && name.includes(":")) {
    const idx = name.indexOf(":");
    issuer = name.slice(0, idx).trim();
    name = name.slice(idx + 1).trim();
  }

  const normalized = normalizeNewAccountInput({
    name: name || issuer || "Unknown",
    issuer,
    secret: bytesToBase32(secret),
    type: typeMap[otpType] ?? "invalid",
    digits: digitMap[digits] ?? Number.NaN,
    period: 30,
    counter,
    algorithm: algMap[algorithm] ?? "invalid",
  });
  return normalized;
}

// ---- parse the outer MigrationPayload ----

export interface GoogleAuthMigrationPayload {
  accounts: NewAccountInput[];
  batchSize: number;
  batchIndex: number;
  batchId: number;
}

function parseMigrationPayload(buf: Uint8Array): GoogleAuthMigrationPayload {
  const entries: NewAccountInput[] = [];
  let batchSize = 1;
  let batchIndex = 0;
  let batchId = 0;
  let pos = 0;
  while (pos < buf.length) {
    const [tag, p1] = decodeVarint(buf, pos);
    pos = p1;
    const field = safeNumber(tag >> 3n);
    const wire = safeNumber(tag & 0x7n);

    if (wire === 2) {
      const [len, p2] = decodeVarint(buf, pos);
      pos = p2;
      const size = safeNumber(len);
      if (size > buf.length - pos) throw new Error("Truncated protobuf field");
      if (field === 1) {
        const entry = parseOtpEntry(buf.slice(pos, pos + size));
        if (entry) entries.push(entry);
      }
      pos += size;
    } else if (wire === 0) {
      const [value, p2] = decodeVarint(buf, pos);
      pos = p2;
      const number = safeNumber(value);
      if (field === 3) batchSize = number;
      else if (field === 4) batchIndex = number;
      else if (field === 5) batchId = number;
    } else {
      break;
    }
  }
  return { accounts: entries, batchSize: Math.max(1, batchSize), batchIndex, batchId };
}

// ---- public API ----

/**
 * Parse a Google Authenticator migration URI.
 * Format: otpauth-migration://offline?data=BASE64
 */
export function parseGoogleAuthMigrationPayload(uri: string): GoogleAuthMigrationPayload | null {
  const trimmed = uri.trim();
  if (!trimmed.startsWith("otpauth-migration://")) return null;

  try {
    const dataMatch = trimmed.match(/[?&]data=([^&]+)/);
    if (!dataMatch) return null;

    const b64 = decodeURIComponent(dataMatch[1]!);
    const raw = atob(b64);
    const buf = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      buf[i] = raw.charCodeAt(i);
    }

    const payload = parseMigrationPayload(buf);
    return payload.accounts.length > 0 ? payload : null;
  } catch {
    return null;
  }
}

export function parseGoogleAuthMigration(uri: string): NewAccountInput[] | null {
  const payload = parseGoogleAuthMigrationPayload(uri);
  if (!payload || payload.batchSize > 1) return null;
  return payload.accounts;
}
