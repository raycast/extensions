export interface JWTHeader {
  alg: string;
  typ?: string;
  kid?: string;
  [key: string]: unknown;
}

export interface JWTPayload {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  nbf?: number;
  jti?: string;
  [key: string]: unknown;
}

export interface DecodedJWT {
  header: JWTHeader;
  payload: JWTPayload;
  signature: string;
}

function decodeObject(segment: string, label: string): Record<string, unknown> {
  if (!/^[A-Za-z0-9_-]+$/.test(segment) || segment.length % 4 === 1) {
    throw new Error(`Invalid JWT: invalid ${label} encoding`);
  }
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
  } catch {
    throw new Error(`Invalid JWT: cannot decode ${label}`);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid JWT: ${label} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

export function decodeJWT(token: string): DecodedJWT {
  const parts = token.trim().split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT: expected 3 parts separated by dots");
  const header = decodeObject(parts[0], "header");
  const payload = decodeObject(parts[1], "payload");
  if (typeof header.alg !== "string" || !header.alg.trim()) throw new Error("Invalid JWT: missing algorithm");
  for (const field of ["typ", "kid"]) {
    if (header[field] !== undefined && typeof header[field] !== "string") {
      throw new Error(`Invalid JWT: ${field} must be a string`);
    }
  }
  for (const field of ["sub", "iss", "jti"]) {
    if (payload[field] !== undefined && typeof payload[field] !== "string") {
      throw new Error(`Invalid JWT: ${field} must be a string`);
    }
  }
  for (const field of ["exp", "iat", "nbf"]) {
    const value = payload[field];
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 8.64e12)) {
      throw new Error(`Invalid JWT: ${field} must be a valid NumericDate`);
    }
  }
  const audience = payload.aud;
  if (
    audience !== undefined &&
    typeof audience !== "string" &&
    !(Array.isArray(audience) && audience.every((value) => typeof value === "string"))
  ) {
    throw new Error("Invalid JWT: aud must be a string or string array");
  }
  if (!/^[A-Za-z0-9_-]*$/.test(parts[2])) throw new Error("Invalid JWT: invalid signature encoding");
  return { header: header as JWTHeader, payload: payload as JWTPayload, signature: parts[2] };
}

export function validateQuickLink(name: string, token: string) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Enter a name for the quick link");
  decodeJWT(token);
  return { name: trimmedName, jwt: token.trim() };
}

export function quickLinkDescription(name: string) {
  return `## Quick Link: ${name}\n\nPress **⏎ Return** to save this quick link to Raycast.\n\nOpening it will launch the JWT Editor with your token pre-filled and ready to decode.\n\nSignature verification is not performed.`;
}
