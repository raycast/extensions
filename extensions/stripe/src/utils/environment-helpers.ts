import type { Environment } from "@src/types";

/**
 * Utility functions for working with Stripe environments (test/live).
 */

/**
 * Gets the display label for an environment.
 *
 * @param env - The environment ("test" or "live")
 * @returns Display-friendly label ("Test" or "Live")
 *
 * @example
 * ```typescript
 * getEnvironmentLabel("test") // "Test"
 * getEnvironmentLabel("live") // "Live"
 * ```
 */
export const getEnvironmentLabel = (env: Environment): string => {
  return env === "test" ? "Test" : "Live";
};

/**
 * Gets the opposite environment.
 *
 * @param env - The current environment
 * @returns The opposite environment
 *
 * @example
 * ```typescript
 * getOppositeEnvironment("test") // "live"
 * getOppositeEnvironment("live") // "test"
 * ```
 */
export const getOppositeEnvironment = (env: Environment): Environment => {
  return env === "test" ? "live" : "test";
};

/**
 * Formats an environment-aware profile label for display.
 *
 * @param profileName - The profile name
 * @param env - The environment
 * @returns Formatted string like "Profile Name (Test)"
 *
 * @example
 * ```typescript
 * formatProfileLabel("My Account", "test") // "My Account (Test)"
 * formatProfileLabel(undefined, "live") // "(Live)"
 * ```
 */
export const formatProfileLabel = (profileName: string | undefined, env: Environment): string => {
  const envLabel = getEnvironmentLabel(env);
  return profileName ? `${profileName} (${envLabel})` : `(${envLabel})`;
};
