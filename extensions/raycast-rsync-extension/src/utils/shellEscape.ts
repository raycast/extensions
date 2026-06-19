/**
 * Shell escaping utilities to prevent command injection vulnerabilities
 */

/**
 * Escapes a string for safe use in shell commands
 * Wraps the string in single quotes and escapes any single quotes within it
 * This is the safest method for POSIX shells (sh, bash, zsh)
 *
 * @param str - The string to escape
 * @returns The escaped string safe for use in shell commands
 *
 * @example
 * shellEscape("file.txt") => "'file.txt'"
 * shellEscape("file'name.txt") => "'file'\\''name.txt'"
 * shellEscape("path; rm -rf /") => "'path; rm -rf /'"
 */
export function shellEscape(str: string): string {
  // Replace single quotes with: '\'' (end quote, escaped quote, start quote)
  // This works because: 'string' becomes 'string'\''more' which the shell interprets as 'string'more'
  return `'${str.replace(/'/g, "'\\''")}'`;
}

/**
 * Escapes multiple strings and joins them with spaces
 * Useful for escaping command arguments
 *
 * @param args - Array of strings to escape
 * @returns Space-separated escaped strings
 *
 * @example
 * shellEscapeArgs(["file.txt", "path with spaces"]) => "'file.txt' 'path with spaces'"
 */
export function shellEscapeArgs(args: string[]): string {
  return args.map(shellEscape).join(" ");
}
