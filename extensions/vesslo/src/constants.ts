/**
 * Centralized constants for Vesslo Raycast Extension
 */

// Sort option labels
export const SORT_LABELS = {
  source: "By Source",
  name: "By Name (A-Z)",
  nameDesc: "By Name (Z-A)",
  developer: "By Developer",
} as const;

export type SortOption = keyof typeof SORT_LABELS;
