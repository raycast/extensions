export type SupabaseUser = {
  id: string;
  email?: string | null;
};

export function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

export function isJwtExpired(token: string, bufferMs = 0): boolean {
  try {
    const [, payload] = token.split(".");
    if (!payload) return false;
    const { exp } = JSON.parse(decodeBase64Url(payload)) as { exp?: number };
    if (typeof exp !== "number") return false;
    return exp * 1000 < Date.now() + bufferMs;
  } catch {
    console.warn("[nibit] isJwtExpired: failed to decode token payload");
    return false;
  }
}

export function userFromAccessToken(accessToken: string): SupabaseUser {
  const [, payload] = accessToken.split(".");
  if (!payload) throw new Error("Unable to decode Nibit session.");
  const parsed = JSON.parse(decodeBase64Url(payload)) as {
    sub?: string;
    email?: string | null;
  };
  if (!parsed.sub) throw new Error("Nibit session is missing a user id.");
  return {
    id: parsed.sub,
    email: parsed.email ?? null,
  };
}

export function isMalformedStoredSessionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message === "Unable to decode Nibit session." || error.message === "Nibit session is missing a user id.";
}

export function userFacingAuthMessage(error: unknown, fallback: string): string {
  const message = (error instanceof Error ? error.message : String(error)).trim();
  if (!message) return fallback;
  if (
    message.toLowerCase().includes("cancel") ||
    message.toLowerCase().includes("denied") ||
    message.toLowerCase().includes("canceled")
  ) {
    return "Nibit sign-in was canceled.";
  }
  return fallback;
}
