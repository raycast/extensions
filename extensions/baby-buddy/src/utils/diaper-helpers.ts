/**
 * Get a description of diaper contents (wet, solid or both)
 * @param wet Whether the diaper is wet
 * @param solid Whether the diaper is solid
 * @returns A description of the diaper contents
 */
export function getDiaperDescription(wet: boolean, solid: boolean): string {
  if (wet && solid) return "wet and solid";
  if (wet) return "wet";
  if (solid) return "solid";
  return "";
}
