import crypto from "crypto";

/**
 * Converts a Buffer to a Base64-URL-safe string by:
 * - Converting the Buffer to Base64.
 * - Replacing '+' with '-'.
 * - Replacing '/' with '_'.
 * - Removing '=' padding.
 *
 * @param buffer The Buffer to encode.
 * @returns The Base64-URL-safe encoded string.
 */
function base64URLEncode(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generates a code verifier for PKCE.
 *
 * @param byteLength The number of random bytes to generate. Adjust this to ensure
 *                   the final verifier length (after encoding) is between 43 and 128 characters.
 * @returns A high-entropy random string used as the code verifier.
 */
export function generateCodeVerifier(byteLength = 32): string {
  const randomBytes = crypto.randomBytes(byteLength);
  const verifier = base64URLEncode(randomBytes);

  // Ensure the verifier meets the minimum length requirement (43 characters).
  // If not, recursively generate with a larger byte length.
  if (verifier.length < 43) {
    return generateCodeVerifier(byteLength + 4);
  }

  return verifier;
}
