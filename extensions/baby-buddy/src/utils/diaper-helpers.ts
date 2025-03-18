/**
 * Utility functions for diaper-related operations
 */

/**
 * Validates that a diaper entry has at least wet or solid
 */
export function isValidDiaperType(wet: boolean, solid: boolean): boolean {
  return wet || solid;
}
