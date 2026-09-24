/**
 * The shape of the CLI's `--json` answers and its exit codes, and what a failure means for
 * this extension. No @raycast/api import, so it is tested; `cli.ts` re-exports it.
 */

/** The exit codes the CLI documents (FEATURES.md F13). */
export const EXIT = {
  ok: 0,
  failed: 1,
  badArguments: 2,
  noBrowser: 3,
  notPaired: 4,
  daemonFailed: 5,
} as const;

/** What every `--json` answer carries on failure. */
export interface CliFailure {
  ok: false;
  code: number;
  error: string;
  message: string;
  hint?: string;
}

export interface CliResult<T> {
  exitCode: number;
  answer: (T & { ok: true }) | CliFailure;
}

/**
 * Whether a failure means the setup is missing or has come apart (nothing paired, or no browser
 * connected at all), which Set up and the helper repair answer. Exit code 3 also covers several
 * browsers connected with none named, and a named browser that is not connected; those are the
 * user's to choose, and are told as the CLI says them.
 */
export function isSetupMissing(result: CliResult<unknown>): boolean {
  if (result.exitCode === EXIT.notPaired) return true;
  return result.exitCode === EXIT.noBrowser && !result.answer.ok && result.answer.error === "NO_BROWSER";
}
