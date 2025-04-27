import { getPreferenceValues } from "@raycast/api";

// DEFAULT Pattern
const DEFAULT_EXCLUDE_PATTERNS: ReadonlyArray<string> = [
  "*/node_modules",
  "*/.next",
  "*/.DS_Store",
  "*/build",
  "*/dist",
  "*/.cache",
  "*/.idea",
  "*/.svelte-kit",
];

/**
 * Typesafe Preferences Interface
 */
interface ExtensionPreferences {
  userExcludePatterns?: string;
  overrideDefaultPatterns: boolean;
}

/**
 * Retrieves the effective exclude patterns based on default values
 * and user preferences, using comma-separated input.
 *
 * @returns {string[]} An array of exclude patterns.
 */
export function getExcludePatterns(): string[] {
  // Get preferences
  const { userExcludePatterns = "", overrideDefaultPatterns = true } = getPreferenceValues<ExtensionPreferences>();

  // Parse user patterns: split by comma, trim whitespace, filter empty lines
  const userPatterns = userExcludePatterns
    .split(",") // <--- Changed from "\n" to ","
    .map((pattern) => pattern.trim()) // Trim whitespace around each pattern
    .filter((pattern) => pattern.length > 0); // Remove empty strings resulting from extra commas (e.g., "a,,b" or "a, ")

  let finalPatterns: string[];

  if (overrideDefaultPatterns) {
    // Override: Use user patterns only. If none provided, list is empty.
    finalPatterns = userPatterns;
  } else {
    // Append: Combine defaults and user patterns, removing duplicates
    const combined = new Set([...DEFAULT_EXCLUDE_PATTERNS, ...userPatterns]);
    finalPatterns = Array.from(combined);
  }

  return finalPatterns;
}
