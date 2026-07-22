/**
 * Quote a value for safe inclusion in a copy-pasteable shell command string.
 * Display/copy ONLY — actual process execution uses execFile argument arrays,
 * which never touch a shell. Wraps in double quotes (matching the canonical
 * `open` example) and escapes the characters that are special inside double
 * quotes so any directory name round-trips through the shell unchanged.
 */
export function shellQuoteArg(value: string): string {
  const escaped = value.replace(/(["\\$`])/g, "\\$1");
  return `"${escaped}"`;
}
