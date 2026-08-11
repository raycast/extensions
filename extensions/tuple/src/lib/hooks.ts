import { showFailureToast, useExec } from "@raycast/utils";
import { classifyError, execEnv, getBinaryPath, jsonArgs, parseJson } from "./tuple";
import { TupleErrorKind } from "./types";

/**
 * Shared `useExec` options for every `tuple` invocation: PATH-injected env, a buffer large enough
 * for long transcripts (Node's 1 MB default truncates them), and the same 15 s timeout `runTuple`
 * uses so a stalled daemon socket can't hold a read open indefinitely (the menu bar polls on a timer).
 */
export function tupleExecOptions() {
  return { env: execEnv(), maxBuffer: 32 * 1024 * 1024, timeout: 15_000 } as const;
}

interface UseTupleJsonOptions {
  /**
   * Failure-toast title for unexpected errors. When omitted, all errors are swallowed —
   * use that for surfaces that render their own error state (e.g. the menu bar, where
   * "not in a call" is a normal condition).
   */
  failureTitle?: string;
  /** Defer execution until true (mirrors useExec's `execute`). Defaults to running. */
  execute?: boolean;
}

/**
 * Run a `tuple` read command that emits JSON and parse it, wiring in the binary path,
 * PATH-injected env, and flicker-free `keepPreviousData`. Friendly NotInstalled/DaemonDown
 * states are rendered by callers via {@link TupleErrorEmptyView}; only genuinely unexpected
 * failures raise a toast (and only when `failureTitle` is provided).
 */
export function useTupleJson<T>(args: string[], options: UseTupleJsonOptions = {}) {
  return useExec(getBinaryPath(), jsonArgs(...args), {
    ...tupleExecOptions(),
    parseOutput: ({ stdout, stderr, error, exitCode }) => {
      // A failed invocation never yields JSON — a spawn error (missing binary), a non-zero
      // exit, or a daemon-down message on stderr. Route it through classifyError so callers
      // render a friendly DaemonDown/NotInstalled state instead of an opaque
      // "Could not parse tuple output as JSON". Parsing stdout here would mask the real cause.
      if (error || (exitCode != null && exitCode !== 0)) {
        const err = error as (Error & { code?: string | number; stderr?: string }) | undefined;
        throw classifyError({ code: err?.code, message: err?.message, stderr: err?.stderr ?? stderr });
      }
      return parseJson<T>(stdout);
    },
    keepPreviousData: true,
    execute: options.execute,
    onError: async (error) => {
      if (options.failureTitle && classifyError(error).kind === TupleErrorKind.Unknown) {
        await showFailureToast(error, { title: options.failureTitle });
      }
    },
  });
}
