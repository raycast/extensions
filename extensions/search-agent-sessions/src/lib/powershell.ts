/**
 * Building PowerShell command lines, shared by everything that launches through
 * one.
 *
 * These three pieces are always used together, and were written twice
 * independently before this module existed — once to open a terminal, once to
 * open a file. The copies did not stay identical: only one of them carried
 * `-ErrorAction Stop`, so the other reported a launch that never happened as a
 * success. Keeping them in one place is what stops that recurring, and is why
 * `command` bakes the flag in rather than leaving it to each caller to
 * remember.
 */

/**
 * Escapes a string for a PowerShell single-quoted literal, where the only
 * metacharacter is the quote itself and it is escaped by doubling.
 *
 * Single quotes rather than double throughout: inside them PowerShell expands
 * nothing, so a `$` or a backtick in a directory name is an ordinary character.
 */
export const psQuote = (s: string) => `'${s.split("'").join("''")}'`;

/** `@('a','b')`: a PowerShell array literal of single-quoted arguments. */
export const psList = (args: string[]) => `@(${args.map(psQuote).join(",")})`;

/**
 * The argv that runs `script` and exits.
 *
 * `-ErrorAction Stop` is the load-bearing part. Most of what we ask PowerShell
 * to do — start a process, invoke an item — reports failure as a *non
 * terminating* error, which prints and then leaves the exit code at zero. A
 * caller that reads the exit code, which is the only thing our callers can
 * read, would take "the app is not installed" for success and fall back to
 * nothing. Raising it to terminating is what makes the failure visible.
 *
 * `-NoProfile` keeps a user's profile script out of a launch they did not ask
 * to be scripted, and off the latency of every one.
 */
export const psCommand = (script: string) => [
  "-NoProfile",
  "-Command",
  `${script} -ErrorAction Stop`,
];

/**
 * A `Start-Process` script: the way to give a console program its own console.
 *
 * Node spawns a detached child with DETACHED_PROCESS, and a process created
 * that way is attached to no console at all — so a console program started
 * directly gets no window. `Start-Process` is what allocates one, which makes
 * the process we spawn a short-lived, windowless launcher and the window the
 * user sees its child.
 *
 * `-ArgumentList` is read back by whichever way the local PowerShell builds a
 * command line — 5.1 joins the elements with spaces, newer versions quote them
 * — and both land the same script downstream, since `-Command` takes the rest
 * of the line as one program either way.
 */
export const startProcess = (exe: string, args: string[]) =>
  `Start-Process -FilePath ${psQuote(exe)} -ArgumentList ${psList(args)}`;
