/**
 * Utility function to delay execution by a specified number of milliseconds.
 * @param ms - The number of milliseconds to delay
 * @returns A promise that resolves after the specified delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Escapes single quotes for shell command embedding.
 * @param str - The string to escape
 * @returns The escaped string safe for shell commands
 */
export function escapeForShell(str: string): string {
  return str.replace(/'/g, "'\\''");
}
