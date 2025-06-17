/**
 * Simple translation utility per Raycast guidelines
 *
 * Raycast does not support localization and only supports US English.
 * This module provides direct string access while keeping the API
 * compatible with existing code to minimize changes.
 */

import { en } from "./translations/index";

/**
 * Simplified translation function that only supports English
 * but maintains compatibility with the existing codebase
 *
 * @param key The translation key to lookup (dot notation for nested keys)
 * @param params Optional parameters to substitute in the translation
 * @returns The translated string or the key itself if not found
 */
export function t(key: string, params?: Record<string, string>): string {
  try {
    const keyParts = key.split(".");
    // Navigate the nested translation object
    let current = en as Record<string, unknown>;
    let result: unknown = current;

    for (const part of keyParts) {
      if (current && typeof current === "object" && part in current) {
        result = current[part];
        current = current[part] as Record<string, unknown>;
      } else {
        return key; // Key not found, return the original key
      }
    }

    if (typeof result === "string") {
      let translated = result;

      // Handle parameter replacement if needed
      if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
          translated = translated.replace(new RegExp(`{{${paramKey}}}`, "g"), value);
        });
      }

      return translated;
    }

    return key; // If result is not a string, return the original key
  } catch (error) {
    console.error(`Error in translation lookup: ${key}`, error);
    return key;
  }
}

// Shorthand alias for compatibility with existing code
export const __ = t;

// Export for module compatibility
export default { t, __ };
