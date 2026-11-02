import { randomBytes, randomUUID } from "node:crypto";

export type UuidVersion = 4 | 7;

export function parseUuidVersion(input?: string): UuidVersion {
  const value = (input ?? "").trim().toLowerCase();
  if (value === "" || value === "4" || value === "v4") return 4;
  if (value === "7" || value === "v7") return 7;
  throw new Error(`Unsupported UUID version "${input}". Use v4 or v7.`);
}

export function generateUuid(version: UuidVersion): string {
  return version === 7 ? uuidV7() : randomUUID();
}

/** RFC 9562 UUIDv7: 48-bit big-endian Unix epoch milliseconds, followed by random bits. */
export function uuidV7(now: number = Date.now()): string {
  const bytes = randomBytes(16);
  let ms = Math.floor(now);
  for (let i = 5; i >= 0; i--) {
    bytes[i] = ms % 256;
    ms = Math.floor(ms / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
