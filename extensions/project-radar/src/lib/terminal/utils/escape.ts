// ============================================
// Shell & AppleScript Escape Utilities
// ============================================

/**
 * Escapes a string for safe use as a shell argument.
 * Uses single quotes and escapes any internal single quotes.
 *
 * Example: "hello'world" → "'hello'\''world'"
 */
export function escapeShellArg(arg: string): string {
  // Wrap in single quotes and escape any internal single quotes
  // 'foo'bar' → 'foo'\''bar'
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Escapes a string for safe use inside AppleScript double-quoted strings.
 * Escapes backslashes, double quotes, and control characters.
 */
export function escapeAppleScriptString(str: string): string {
  return str
    .replace(/\\/g, "\\\\") // Backslashes first
    .replace(/"/g, '\\"') // Double quotes
    .replace(/\n/g, "\\n") // Newlines
    .replace(/\r/g, "\\r") // Carriage returns
    .replace(/\t/g, "\\t"); // Tabs
}

/**
 * Builds a safe shell command for cd + optional command execution.
 * Path is escaped to prevent injection. Command is passed through as-is
 * because it's user-configured trusted input that may contain arguments
 * (e.g., "claude --help", "npm run dev").
 */
export function buildSafeShellCommand(path: string, command?: string): string {
  const safePath = escapeShellArg(path);

  if (command) {
    // Command is user-configured and trusted - don't escape it
    // as it may contain arguments (e.g., "claude --help", "npm run dev")
    return `cd ${safePath} && ${command}`;
  }

  return `cd ${safePath}`;
}
