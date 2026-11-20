import { CLERK_ISSUER } from "./config";

export interface ClerkJwtClaims {
  sub: string;
  iss: string;
  email?: string;
  name?: string;
  picture?: string;
}

export function decodeJwtClaims(token: string): ClerkJwtClaims {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Malformed JWT");
    }

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof payload.sub !== "string" || payload.sub.length === 0 || payload.iss !== CLERK_ISSUER) {
      throw new Error("Unexpected claims");
    }

    return {
      sub: payload.sub,
      iss: payload.iss,
      email: optionalString(payload.email),
      name: optionalString(payload.name),
      picture: optionalString(payload.picture),
    };
  } catch {
    throw new Error("Invalid Hotkys access token");
  }
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
