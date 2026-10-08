/**
 * Error handling utilities for the bunq Raycast extension.
 */

import { BunqApiError } from "../api/client";

/**
 * Extracts a user-friendly error message from any error type.
 *
 * Handles:
 * - BunqApiError: Returns the API error description
 * - Standard Error: Returns the error message
 * - Unknown types: Returns "Unknown error"
 *
 * @param error - The error to extract a message from
 * @returns A human-readable error message
 *
 * @example
 * ```ts
 * try {
 *   await createPayment(...);
 * } catch (error) {
 *   await showToast({
 *     style: Toast.Style.Failure,
 *     title: "Payment failed",
 *     message: getErrorMessage(error),
 *   });
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof BunqApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

/**
 * Type guard to check if an error is a BunqApiError.
 *
 * @param error - The error to check
 * @returns True if the error is a BunqApiError
 */
export function isBunqApiError(error: unknown): error is BunqApiError {
  return error instanceof BunqApiError;
}

/**
 * Type guard to check if an error indicates an authentication failure.
 *
 * @param error - The error to check
 * @returns True if the error is a 401 Unauthorized response
 */
export function isAuthenticationError(error: unknown): boolean {
  return error instanceof BunqApiError && error.statusCode === 401;
}
