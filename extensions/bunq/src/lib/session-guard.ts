/**
 * Session validation guards.
 *
 * Use these functions to safely extract authenticated session data
 * instead of using non-null assertions.
 */

import type { BunqSession } from "../hooks/useBunqSession";

/**
 * Error thrown when session is not properly authenticated.
 */
export class SessionNotAuthenticatedError extends Error {
  constructor(message = "Session not authenticated") {
    super(message);
    this.name = "SessionNotAuthenticatedError";
  }
}

/**
 * Requires that a session has a valid userId.
 * Throws if the session is not authenticated.
 *
 * @param session - The bunq session to validate
 * @returns The userId from the session
 * @throws SessionNotAuthenticatedError if userId is not set
 */
export function requireUserId(session: BunqSession): string {
  if (!session.userId) {
    throw new SessionNotAuthenticatedError("Session not authenticated - userId is missing");
  }
  return session.userId;
}

/**
 * Requires that a session has a valid session token.
 * Throws if the session token is not set.
 *
 * @param session - The bunq session to validate
 * @returns The session token
 * @throws SessionNotAuthenticatedError if sessionToken is not set
 */
export function requireSessionToken(session: BunqSession): string {
  if (!session.sessionToken) {
    throw new SessionNotAuthenticatedError("Session not authenticated - sessionToken is missing");
  }
  return session.sessionToken;
}

/**
 * Checks if a session is fully authenticated.
 *
 * @param session - The bunq session to check
 * @returns true if the session has all required authentication data
 */
export function isAuthenticated(session: BunqSession): boolean {
  return !!(session.userId && session.sessionToken);
}
