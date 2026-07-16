import { ErrorResult } from "./types";

/**
 * Thrown when Bitly rejects the request because the access token is missing,
 * invalid, expired, or revoked (Bitly reports this as 401 or 403).
 */
export class BitlyAuthError extends Error {}

function getErrorDetails({ message, description, errors }: ErrorResult): string {
  if (errors?.length) return errors.map((error) => error.message).join(", ");
  return description || message;
}

/**
 * Throws a `BitlyAuthError` for auth-related failures (bad/expired/revoked access
 * token) and a generic `Error` for everything else. No-ops when `response.ok`.
 */
export function assertBitlyOk(response: Response, result: ErrorResult, context?: string): void {
  if (response.ok) return;

  const details = getErrorDetails(result);

  if (response.status === 401 || response.status === 403) {
    throw new BitlyAuthError(
      `${details} Check that your Bitly access token is correct and hasn't expired or been revoked.`,
    );
  }

  throw new Error(`Bitly API Error - ${details}${context ? `, ${context}` : ""}`);
}
