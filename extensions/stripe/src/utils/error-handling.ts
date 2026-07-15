import { showFailureToast } from "@raycast/utils";
import type { Environment } from "@src/types";
import { isStripeError } from "@src/utils/type-guards";

/**
 * Error handling utilities for Stripe operations.
 * Provides consistent error handling and user-friendly error messages.
 */

/**
 * Parses a Stripe API error and returns a user-friendly message.
 *
 * @param error - The error to parse
 * @param env - The environment where the error occurred (test/live)
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * try {
 *   await stripe.customers.retrieve('cus_123');
 * } catch (error) {
 *   const message = parseStripeError(error, 'test');
 *   console.log(message); // "Invalid Test API key. Please check your configuration."
 * }
 * ```
 */
export const parseStripeError = (error: unknown, env: Environment): string => {
  // Handle network errors
  if (error instanceof Error && error.message?.includes("fetch")) {
    return "Network error. Check your internet connection.";
  }

  // Handle Stripe API errors
  if (error instanceof Error) {
    const message = error.message;

    if (message?.includes("Invalid API Key")) {
      return `Invalid ${env === "test" ? "Test" : "Live"} API key. Please check your configuration.`;
    }

    if (message?.includes("Unauthorized")) {
      return "Authentication failed. Your API key may have been revoked.";
    }

    if (message?.includes("rate limit")) {
      return "Too many requests. Please wait a moment and try again.";
    }

    // Return the original error message if it's user-friendly
    if (message && !message.includes("HTTP")) {
      return message;
    }
  }

  return "Failed to load data from Stripe. Please try again.";
};

/**
 * Handles Stripe errors by showing a failure toast with a user-friendly message.
 *
 * @param error - The error to handle
 * @param context - Description of what operation failed (e.g., "load customers")
 * @param env - Optional environment context for better error messages
 *
 * @example
 * ```typescript
 * try {
 *   await stripe.customers.list();
 * } catch (error) {
 *   await handleStripeError(error, "load customers", "test");
 * }
 * ```
 */
export const handleStripeError = async (error: unknown, context: string, env?: Environment): Promise<void> => {
  const message = env ? parseStripeError(error, env) : undefined;

  await showFailureToast(error, {
    title: `Failed to ${context}`,
    message,
  });

  // Log for debugging
  console.error(`Stripe Error [${context}]:`, error);
};

/**
 * Type guard to check if an error is a standard Error object.
 *
 * @param error - The value to check
 * @returns True if the value is an Error
 */
export const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};

/**
 * Extracts an error message from an unknown error value.
 *
 * @param error - The error to extract message from
 * @returns Error message string
 *
 * @example
 * ```typescript
 * try {
 *   throw new Error("Something went wrong");
 * } catch (error) {
 *   console.log(getErrorMessage(error)); // "Something went wrong"
 * }
 * ```
 */
export const getErrorMessage = (error: unknown): string => {
  if (isError(error)) {
    return error.message || "Unknown error occurred";
  }

  if (isStripeError(error)) {
    return error.message || "Unknown error occurred";
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error occurred";
};
