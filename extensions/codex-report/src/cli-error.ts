/** The CLI's own error line, without the command line and local paths that execFile errors repeat. */
export function cliErrorMessage(stderr: string): string {
  const lines = stderr
    .split("\n")
    .map((line) => line.trim())
    // The CLI appends its usage to every error, and crashes end with a stack trace and the Node version.
    .filter((line) => line && !/^(Usage: |at |Node\.js v)/.test(line));
  return lines.at(-1) ?? "Could not read local sessions.";
}
