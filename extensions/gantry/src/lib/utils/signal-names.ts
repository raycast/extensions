/**
 * Maps negative exit codes (negated signal numbers) to POSIX signal names.
 * macOS/Darwin uses standard POSIX signals.
 */
const SIGNAL_MAP: Record<number, string> = {
  1: "SIGHUP",
  2: "SIGINT",
  3: "SIGQUIT",
  4: "SIGILL",
  5: "SIGTRAP",
  6: "SIGABRT",
  7: "SIGEMT",
  8: "SIGFPE",
  9: "SIGKILL",
  10: "SIGBUS",
  11: "SIGSEGV",
  12: "SIGSYS",
  13: "SIGPIPE",
  14: "SIGALRM",
  15: "SIGTERM",
  16: "SIGURG",
  17: "SIGSTOP",
  18: "SIGTSTP",
  19: "SIGCONT",
  20: "SIGCHLD",
  21: "SIGTTIN",
  22: "SIGTTOU",
  23: "SIGIO",
  24: "SIGXCPU",
  25: "SIGXFSZ",
  26: "SIGVTALRM",
  27: "SIGPROF",
  28: "SIGWINCH",
  29: "SIGINFO",
  30: "SIGUSR1",
  31: "SIGUSR2",
};

/**
 * Interprets a launchd exit code into a human-readable string.
 *
 * - null -> "Never run"
 * - 0 -> "Success"
 * - negative -> signal name (e.g., -9 -> "SIGKILL")
 * - positive -> "Error (N)"
 */
export function interpretExitCode(code: number | null): string {
  if (code === null) {
    return "Never run";
  }
  if (code === 0) {
    return "Success";
  }
  if (code < 0) {
    const signalNum = Math.abs(code);
    const name = SIGNAL_MAP[signalNum];
    return name ?? `Signal ${signalNum}`;
  }
  return `Error (${code})`;
}
