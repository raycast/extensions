/**
 * Lightweight UUID v4 generator using Node's built-in crypto module.
 *
 * No external dependencies. Generates RFC 4122 compliant v4 UUIDs.
 */

import { randomBytes } from "node:crypto";

/**
 * Generates a random UUID v4 string.
 *
 * Format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
 * where `y` is one of [8, 9, a, b].
 *
 * @returns A new UUID v4 string, e.g. "a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5"
 */
export function generateId(): string {
  const bytes = randomBytes(16);

  // Set version bits (4 = 0100) in byte 6
  bytes[6] = (bytes[6] & 0x0f) | 0x40;

  // Set variant bits (10xx) in byte 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");

  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join("-");
}
