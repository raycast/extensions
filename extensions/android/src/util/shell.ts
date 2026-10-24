// POSIX-safe single-quote wrapping for an untrusted shell argument. Shared by
// every module that assembles an `android`/`adb`/`open` command line so
// application names and paths containing spaces or quotes can't break out of
// the command. Kept free of any Raycast or Node imports so the pure
// command-builders can depend on it and stay unit-testable.
export function quoteArg(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
