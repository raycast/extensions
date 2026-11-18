/** Quotes a value for a POSIX shell, so that spaces and quotes in a path are kept as they are. */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Escapes a value for a double-quoted AppleScript string. */
export function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** AppleScript that brings Terminal to the front and runs `login` with this pass-cli executable. */
export function terminalLoginScript(cliPath: string): string {
  const command = `${shellQuote(cliPath)} login`;
  return [
    'tell application "Terminal"',
    "  activate",
    `  do script "${escapeAppleScriptString(command)}"`,
    "end tell",
  ].join("\n");
}
