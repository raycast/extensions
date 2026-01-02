/**
 * Centralized environment variable access for mdconv.
 * Provides type-safe access to debug flags and system settings.
 */

/**
 * Get the process environment safely across different platforms.
 */
function getProcessEnv(): Record<string, string | undefined> {
  return (typeof globalThis !== 'undefined' && 
          (globalThis as any).process?.env) || {};
}

/**
 * Debug configuration consolidated from across the codebase.
 * Re-evaluates environment on each access for test compatibility.
 */
export const debugConfig = {
  /** Enable all debug logging when set to "1" */
  get allDebug(): boolean { return getProcessEnv().MDCONV_DEBUG === "1"; },
  
  /** Enable verbose HTML→Markdown conversion debugging */
  get inlineDebug(): boolean { return getProcessEnv().MDCONV_DEBUG_INLINE === "1"; },
  
  /** Enable clipboard debugging in Raycast adapter */
  get clipboardDebug(): boolean { return ["1", "true", "TRUE"].includes(getProcessEnv().MDCONV_DEBUG_CLIPBOARD ?? ""); },
  
  /** Check if running in test environment */
  get isTest(): boolean { return getProcessEnv().NODE_ENV === "test"; },
} as const;

/**
 * System locale information for clipboard operations.
 * Re-evaluates environment on each access for test compatibility.
 */
const localeConfig = {
  /** Current LANG setting */
  get lang(): string | undefined { return getProcessEnv().LANG; },
  
  /** Current LC_ALL setting */
  get lcAll(): string | undefined { return getProcessEnv().LC_ALL; },
  
  /** Current LC_CTYPE setting */
  get lcCtype(): string | undefined { return getProcessEnv().LC_CTYPE; },
} as const;

/**
 * Helper to create environment options for shell commands.
 * Ensures UTF-8 encoding locale for pbpaste operations.
 */
export function createUtf8Env(baseLocale?: string): Record<string, string> {
  const env: Record<string, string> = {};
  
  // Copy existing environment, filtering out undefined values
  Object.entries(getProcessEnv()).forEach(([key, value]) => {
    if (value !== undefined) {
      env[key] = value;
    }
  });
  
  // Get current LC_ALL value directly to avoid getter timing issues
  const currentLcAll = getProcessEnv().LC_ALL;
  
  // Derive base locale from LC_ALL or default to en_US
  // Handle complex Raycast locales like "en_US-u-hc-h12-u-ca-gregory-u-nu-latn"
  const derivedLocale = baseLocale || 
    currentLcAll?.split('-')[0]?.split('.')[0] || 
    'en_US';
  const utf8Locale = `${derivedLocale}.UTF-8`;
  
  // Debug logging for locale normalization
  if (getProcessEnv().MDCONV_DEBUG_CLIPBOARD) {
    console.log(`[env] Locale normalization: ${currentLcAll} → ${utf8Locale}`);
  }
  
  // Force UTF-8 locale
  env.LC_ALL = utf8Locale;
  env.LANG = utf8Locale;
  
  return env;
}