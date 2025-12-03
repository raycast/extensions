/**
 * Async utilities for the Brew extension.
 *
 * Provides helper functions for async operations.
 */

/**
 * Wait for a specified number of milliseconds.
 *
 * Useful for:
 * - Waiting for toast actions to be clicked
 * - Implementing retry delays
 * - Debouncing operations
 *
 * Note: For "no view" commands, this allows users time to click Toast actions.
 * See: https://raycastapp.slack.com/archives/C01E6LWGXJ8/p1642676284027700
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
