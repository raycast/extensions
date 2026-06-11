/**
 * Decodes the payload segment of a JWT without verifying the signature.
 * Returns null if the token is malformed or the payload cannot be parsed.
 */
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Convert base64url to base64
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // Add padding if needed
    const padding = base64.length % 4;
    if (padding) {
      base64 += "=".repeat(4 - padding);
    }

    const payload = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}
