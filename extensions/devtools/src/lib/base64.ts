import { isUtf8 } from "node:buffer";

export type Base64Variant = "base64" | "base64url";

export function encodeBase64(text: string, variant: Base64Variant = "base64"): string {
  return Buffer.from(text, "utf8").toString(variant);
}

export function decodeBase64(text: string, variant: Base64Variant = "base64"): string {
  const input = text.replace(/\s/g, "");
  if (!input) return "";
  const alphabet = variant === "base64" ? /^[A-Za-z0-9+/]*={0,2}$/ : /^[A-Za-z0-9_-]*={0,2}$/;
  if (!alphabet.test(input))
    throw new Error("The input contains invalid Base64 characters. Check the selected format.");

  const unpadded = input.replace(/=+$/, "");
  const padding = input.length - unpadded.length;
  if (
    unpadded.length % 4 === 1 ||
    (padding > 0 && (input.length % 4 !== 0 || padding !== (4 - (unpadded.length % 4)) % 4))
  ) {
    throw new Error("Invalid Base64 length or trailing = padding.");
  }
  const bytes = Buffer.from(unpadded, variant);
  // Buffer's decoder silently accepts malformed input; reject non-canonical trailing bits.
  if (bytes.toString(variant).replace(/=+$/, "") !== unpadded) {
    throw new Error("Invalid Base64 data: the trailing bits are incorrect.");
  }
  if (!isUtf8(bytes)) {
    throw new Error("The decoded data is not valid UTF-8 text. This command encodes and decodes text.");
  }
  return bytes.toString("utf8");
}
