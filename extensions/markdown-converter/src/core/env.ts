/**
 * Centralized environment variable access for mdconv.
 * Provides type-safe access to debug flags and system settings.
 */

/**
 * Get the process environment safely across different platforms.
 */
function getProcessEnv(): Record<string, string | undefined> {
  if (typeof globalThis !== "undefined") {
    const g = globalThis as Record<string, unknown>;
    const proc = g.process as { env: Record<string, string | undefined> } | undefined;
    if (proc?.env) return proc.env;
  }
  return {};
}

/**
 * Debug configuration consolidated from across the codebase.
 * Re-evaluates environment on each access for test compatibility.
 */
export const debugConfig = {
  /** Enable all debug logging when set to "1" */
  get allDebug(): boolean {
    return getProcessEnv().MDCONV_DEBUG === "1";
  },

  /** Enable verbose HTML→Markdown conversion debugging */
  get inlineDebug(): boolean {
    return getProcessEnv().MDCONV_DEBUG_INLINE === "1";
  },

  /** Enable clipboard debugging in Raycast adapter */
  get clipboardDebug(): boolean {
    return ["1", "true", "TRUE"].includes(getProcessEnv().MDCONV_DEBUG_CLIPBOARD ?? "");
  },

  /** Check if running in test environment */
  get isTest(): boolean {
    return getProcessEnv().NODE_ENV === "test";
  },
} as const;
