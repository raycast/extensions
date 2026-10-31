// Decode a JWT payload locally. Used only to read identity claims (email, account id, exp)
// from credential files the user's own CLIs wrote. Never log, cache or display token values.
export function decodeJwtPayload(token: unknown): Record<string, unknown> | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const payload = JSON.parse(json);
    return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Seconds-since-epoch `exp` claim as a millisecond timestamp, or null. */
export function jwtExpiryMs(token: unknown): number | null {
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp === "number" && Number.isFinite(exp) ? exp * 1000 : null;
}
