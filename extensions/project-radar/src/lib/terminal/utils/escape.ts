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
 * Escapes backslashes and double quotes.
 */
export function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Builds a safe shell command for cd + optional command execution.
 * All arguments are properly escaped to prevent injection.
 */
export function buildSafeShellCommand(path: string, command?: string): string {
  const safePath = escapeShellArg(path);

  if (command) {
    // For commands, we need to be careful:
    // - If it's a simple command like "claude" or "nvim", escape it
    // - The command is user-provided and trusted (they configured it themselves)
    // But we still escape to prevent accidental issues with special chars
    const safeCommand = escapeShellArg(command);
    return `cd ${safePath} && ${safeCommand}`;
  }

  return `cd ${safePath}`;
}
