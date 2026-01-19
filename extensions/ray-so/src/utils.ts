/**
 * Encodes a string to a URL-safe base64 format for ray.so
 * @param text - The text to encode
 * @returns URL-safe base64 encoded string
 */
export function encodeForRayso(text: string): string {
  return Buffer.from(text, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
