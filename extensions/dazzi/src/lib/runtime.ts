import { getPreferenceValues } from "@raycast/api";
import { type ExecFileException, execFile } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { homedir } from "node:os";
import { dazziAppCandidates, launcherPath, toolEnv } from "./dazzi";

/** The side of the extension that touches the disk and starts processes. */

export class DazziNotFoundError extends Error {
  constructor(readonly looked: readonly string[]) {
    super(`Dazzi.app was not found (looked in ${looked.join(", ")})`);
  }
}

/** Why a program did not run to its own exit: the OS refused to start it, it was killed, or it ran out of time. */
export interface RunFailure {
  /** `ENOENT`, `EACCES`, `ETIMEDOUT`, a signal name such as `SIGSEGV`, or whatever other code Node reported. */
  readonly code: string;
  readonly message: string;
}

export interface RunResult {
  /** The program's exit status; `null` when it never exited on its own, and then `failure` says why. */
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly failure?: RunFailure;
}

function describeFailure(error: ExecFileException, timeoutMs: number) {
  if (error.killed === true && error.signal === "SIGTERM") {
    return { code: "ETIMEDOUT", message: `Timed out after ${timeoutMs / 1000} seconds` };
  }
  const reason = error.message.split("\n")[0] ?? "";
  const code = typeof error.code === "string" ? error.code : (error.signal ?? "UNKNOWN");
  return { code, message: reason.length > 0 ? reason : `The program stopped (${code})` };
}

/** The installed Dazzi.app: the first candidate that ships an executable `dazzi` launcher. */
export async function resolveDazziApp(): Promise<string> {
  const { dazziApp } = getPreferenceValues<Preferences>();
  const candidates = dazziAppCandidates(dazziApp ?? "", homedir());
  for (const candidate of candidates) {
    const ok = await access(launcherPath(candidate), constants.X_OK).then(
      () => true,
      () => false,
    );
    if (ok) return candidate;
  }
  throw new DazziNotFoundError(candidates);
}

/** Run one of the app's programs with an argv (never a shell), in the app's tool environment. */
export function run(
  app: string,
  file: string,
  args: readonly string[],
  options: { timeoutMs: number; signal?: AbortSignal },
): Promise<RunResult> {
  const { promise, resolve, reject } = Promise.withResolvers<RunResult>();
  execFile(
    file,
    [...args],
    {
      env: toolEnv(app, process.env),
      timeout: options.timeoutMs,
      maxBuffer: 64 * 1024 * 1024,
      signal: options.signal,
      encoding: "utf8",
    },
    (error, stdout, stderr) => {
      if (error !== null && (error.name === "AbortError" || options.signal?.aborted === true)) {
        reject(error);
        return;
      }
      if (error === null) {
        resolve({ status: 0, stdout, stderr });
      } else if (typeof error.code === "number") {
        resolve({ status: error.code, stdout, stderr });
      } else {
        resolve({ status: null, stdout, stderr, failure: describeFailure(error, options.timeoutMs) });
      }
    },
  );
  return promise;
}
