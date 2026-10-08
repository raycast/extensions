/**
 * Wraps a string in single quotes for safe use in shell commands.
 * Inner single quotes are escaped as `'\''`.
 */
export function shellQuote(value: string): string {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

/**
 * Returns a shell-safe `cd` command for the given directory.
 */
export function shellCd(dir: string): string {
  return `cd -- ${shellQuote(dir)}`;
}
