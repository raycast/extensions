import { randomBytes } from "node:crypto";

export type UuidOutputSeparator = "new-line" | "comma";

const maxUuidCount = 100;

export function generateUuidV7(timestamp = Date.now()): string {
  const bytes = randomBytes(16);
  const unixTsMs = Math.max(0, Math.min(timestamp, 0xffffffffffff));

  bytes[0] = (unixTsMs / 0x10000000000) & 0xff;
  bytes[1] = (unixTsMs / 0x100000000) & 0xff;
  bytes[2] = (unixTsMs / 0x1000000) & 0xff;
  bytes[3] = (unixTsMs / 0x10000) & 0xff;
  bytes[4] = (unixTsMs / 0x100) & 0xff;
  bytes[5] = unixTsMs & 0xff;
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return formatUuid(bytes);
}

export function generateUuidV7Batch(count: number): string[] {
  const safeCount = normalizeUuidCount(count);

  return Array.from({ length: safeCount }, () => generateUuidV7());
}

export function formatUuidBatch(
  uuids: string[],
  separator: UuidOutputSeparator,
): string {
  return uuids.join(separator === "comma" ? "," : "\n");
}

export function normalizeUuidCount(count: number): number {
  if (!Number.isFinite(count)) {
    return 1;
  }

  return Math.max(1, Math.min(Math.trunc(count), maxUuidCount));
}

function formatUuid(bytes: Buffer): string {
  const hex = bytes.toString("hex");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
