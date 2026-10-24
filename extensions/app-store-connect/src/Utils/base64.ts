/**
 * Base64 helpers for the App Store Connect private key.
 *
 * Node-only on purpose: the extension declares `platforms: ["macOS"]` and `@raycast/api`
 * requires Node >= 22.22.2, so `Buffer` is always present. The previous `typeof btoa`
 * and `typeof atob` fallbacks were unreachable branches guarding against a browser
 * runtime this extension cannot run in.
 */

/** Encodes a PEM private key for storage. */
export function encodeBase64(value: string): string {
  return Buffer.from(value).toString("base64");
}

/** Decodes a stored private key back to PEM. */
export function decodeBase64(value: string): string {
  return Buffer.from(value, "base64").toString("utf-8");
}
