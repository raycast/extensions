/**
 * Predefined color palette for team tags
 * Using Raycast's color palette for consistency
 */
const TEAM_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#FFA07A", // Light Salmon
  "#98D8C8", // Mint
  "#F7DC6F", // Yellow
  "#BB8FCE", // Purple
  "#85C1E2", // Sky Blue
  "#F8B739", // Orange
  "#52C41A", // Green
  "#EB5757", // Crimson
  "#2F80ED", // Ocean Blue
  "#9B59B6", // Violet
  "#E67E22", // Carrot
  "#1ABC9C", // Turquoise
  "#E91E63", // Pink
  "#00BCD4", // Cyan
  "#FF9800", // Amber
  "#795548", // Brown
  "#607D8B", // Blue Grey
];

/**
 * Simple hash function to convert a string to a number
 * Uses the same algorithm as Java's String.hashCode()
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Gets a deterministic color for a team name using hash-based selection
 * No API calls required - purely client-side computation
 * Same team name always returns the same color
 *
 * @param teamName - The name of the team
 * @returns Hex color string (e.g., "#FF6B6B") or undefined if no team name
 */
export function getTeamColor(teamName: string | null | undefined): string | undefined {
  if (!teamName) return undefined;

  // Hash the team name and map to color palette
  const hash = hashString(teamName);
  const colorIndex = hash % TEAM_COLORS.length;
  const color = TEAM_COLORS[colorIndex];

  return color;
}

/**
 * Gets the color for a team synchronously (same as getTeamColor now)
 * Kept for backwards compatibility
 *
 * @param teamName - The name of the team
 * @returns Hex color string or undefined if no team name
 */
export function getTeamColorSync(teamName: string | null | undefined): string | undefined {
  return getTeamColor(teamName);
}
