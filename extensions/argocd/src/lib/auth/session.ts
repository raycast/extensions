/**
 * The stored SSO session, and the decision to renew it.
 *
 * Renewal happens ahead of expiry rather than on a 401, for a reason worth stating: a 401 on a
 * list request means the operator sees an error and has to retry, whereas a token renewed
 * thirty seconds early means they never see anything. The whole value of the refresh token is
 * that nothing surfaces.
 */

import { decodeExpiry, type TokenSet } from "./oidc";

export interface SsoSession {
  idToken: string;
  refreshToken: string | undefined;
  /** Epoch milliseconds. Undefined for an opaque token with no readable expiry. */
  expiresAt: number | undefined;
  /** Kept so a session is invalidated when the instance is pointed at another provider. */
  issuer: string;
  clientId: string;
}

/** Renew this far ahead of expiry, so a request is never sent with a token about to lapse. */
export const RENEW_AHEAD_MS = 60_000;

export function sessionFromTokens(tokens: TokenSet, issuer: string, clientId: string): SsoSession {
  return {
    idToken: tokens.idToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt ?? decodeExpiry(tokens.idToken),
    issuer,
    clientId,
  };
}

/**
 * Merges a renewal into the stored session. A provider that does not rotate the refresh token
 * returns none, and the existing one stays valid, so it is kept.
 */
export function mergeRenewal(previous: SsoSession, tokens: TokenSet): SsoSession {
  return {
    ...previous,
    idToken: tokens.idToken,
    refreshToken: tokens.refreshToken ?? previous.refreshToken,
    expiresAt: tokens.expiresAt ?? decodeExpiry(tokens.idToken),
  };
}

export function isExpired(session: SsoSession, now: number): boolean {
  return session.expiresAt !== undefined && session.expiresAt <= now;
}

/**
 * True when the token should be renewed before use. An unknown expiry is left alone: there is
 * nothing to renew ahead of, and the server remains the authority.
 */
export function needsRenewal(session: SsoSession, now: number, aheadMs = RENEW_AHEAD_MS): boolean {
  if (session.expiresAt === undefined) {
    return false;
  }
  return session.expiresAt - aheadMs <= now;
}

/** True when the session cannot be renewed and a browser login is the only way forward. */
export function needsLogin(session: SsoSession | undefined, now: number): boolean {
  if (!session) {
    return true;
  }
  if (!session.refreshToken) {
    return isExpired(session, now);
  }
  return false;
}

/** A session is void once the instance points at a different provider or client. */
export function matchesProvider(session: SsoSession, issuer: string, clientId: string): boolean {
  return session.issuer === issuer && session.clientId === clientId;
}

export function serializeSession(session: SsoSession): string {
  return JSON.stringify(session);
}

/**
 * Reads a stored session back. Storage is not something to trust blindly, so anything that
 * does not carry an id token is discarded rather than repaired.
 */
export function parseSession(raw: string | undefined): SsoSession | undefined {
  if (!raw) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return undefined;
  }

  const value = parsed as Record<string, unknown>;
  const idToken = typeof value.idToken === "string" ? value.idToken : undefined;
  if (!idToken || idToken.length === 0) {
    return undefined;
  }

  return {
    idToken,
    refreshToken: typeof value.refreshToken === "string" ? value.refreshToken : undefined,
    expiresAt:
      typeof value.expiresAt === "number" && Number.isFinite(value.expiresAt)
        ? value.expiresAt
        : decodeExpiry(idToken),
    issuer: typeof value.issuer === "string" ? value.issuer : "",
    clientId: typeof value.clientId === "string" ? value.clientId : "",
  };
}
