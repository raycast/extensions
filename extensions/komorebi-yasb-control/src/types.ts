export interface Preferences {
  workspaceCount: string;
}

/**
 * Parse and validate workspace count from preferences
 * Returns a number between 1 and 20, defaulting to 10 if invalid
 */
export function parseWorkspaceCount(workspaceCount: string): number {
  const parsed = parseInt(workspaceCount, 10);
  if (isNaN(parsed)) {
    return 10; // Default if not a valid number
  }
  return Math.max(1, Math.min(20, parsed));
}
