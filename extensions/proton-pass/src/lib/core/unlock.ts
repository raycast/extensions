import { spawn } from "node:child_process";
import { PassCliError } from "../types";
import { CommandDescriptor, classifyCliError, normalizeCliExecutionError } from "./exec";
import { shellQuote } from "./terminal-login";

/** What an unlock found: the session unlocked with the code, or not locked anymore, e.g. unlocked in a terminal. */
export type UnlockOutcome = "unlocked" | "not_locked";

export interface UnlockOptions {
  env?: NodeJS.ProcessEnv;
  /** How long pass-cli may take to ask for the code: it first asks Proton whether the session is locked. */
  promptTimeout?: number;
  /** How long it may take to check the code once typed. */
  timeout?: number;
}

/** The code is never among them: pass-cli asks for it. */
export const UNLOCK_ARGS = ["session", "unlock"] as const;

const PROMPT = "Enter lock code:";
/**
 * pass-cli turns off what the terminal shows of the typing only once its prompt is printed: the code waits this long,
 * so that it never shows.
 */
const ECHO_OFF_DELAY_MS = 250;
const PROMPT_TIMEOUT_MS = 30_000;
const UNLOCK_TIMEOUT_MS = 60_000;

/** Whether the extension can type the code at pass-cli's prompt itself: see unlockSession. */
export const canUnlockInExtension = (platform: NodeJS.Platform = process.platform) => platform === "darwin";

/**
 * pass-cli reads the lock code from a terminal only (rpassword reads /dev/tty), never from an argument, a variable
 * or a pipe, and Raycast's commands have no terminal: macOS's `script` gives it one. `script` refuses Node's stdin,
 * a socket, so `cat` passes it on through a pipe. Once pass-cli is done, `script` ends, but `cat` would wait for more
 * input: its process group, which the shell leads, is ended then.
 */
function inTerminal(command: CommandDescriptor): CommandDescriptor {
  return {
    file: "/bin/sh",
    args: [
      "-c",
      'cat | { /usr/bin/script -q /dev/null "$@"; kill -TERM -$$; }',
      "sh",
      command.file,
      ...command.args,
      ...UNLOCK_ARGS,
    ],
  };
}

/** What pass-cli printed, without the prompt, the code if the terminal showed it, or "Session is locked…" again. */
function failureMessage(output: string, code: string, fallback = "pass-cli couldn't unlock the session."): string {
  const lines = (code ? output.split(code).join("") : output)
    .split(/\r?\n|\r/)
    .map((line) => line.replace(PROMPT, "").trim())
    .filter((line) => line && line !== "Caused by:" && !line.startsWith("Session is locked."))
    .map((line) => line.replace(/^Error:\s*/, "").replace(/^\d+:\s*/, ""));
  return lines.join(": ") || fallback;
}

/**
 * Unlocks the session with its lock code, typed at pass-cli's own prompt once it shows. The code is never in the
 * command's arguments or environment, never written anywhere, and left out of the error shown when the unlock fails.
 */
export function unlockSession(
  command: CommandDescriptor,
  code: string,
  options: UnlockOptions = {},
): Promise<UnlockOutcome> {
  const terminal = inTerminal(command);
  return new Promise((resolve, reject) => {
    // In a process group of its own, which ends with it.
    const child = spawn(terminal.file, terminal.args, { env: options.env, detached: true });
    let output = "";
    let isPrompted = false;
    let isDone = false;
    let timer = setTimeout(
      () => stop("pass-cli didn't ask for the lock code."),
      options.promptTimeout ?? PROMPT_TIMEOUT_MS,
    );

    function settle(outcome: UnlockOutcome | PassCliError) {
      if (isDone) return;
      isDone = true;
      clearTimeout(timer);
      child.stdin.destroy();
      if (outcome instanceof PassCliError) reject(outcome);
      else resolve(outcome);
    }

    function stop(message: string) {
      try {
        if (child.pid) process.kill(-child.pid, "SIGTERM");
      } catch {
        // Already ended.
      }
      settle(new PassCliError(message, "timeout"));
    }

    function read(chunk: Buffer) {
      output += chunk.toString("utf8");
      if (isPrompted || !output.includes(PROMPT)) return;
      isPrompted = true;
      clearTimeout(timer);
      timer = setTimeout(
        () => stop("pass-cli took too long to check the lock code."),
        options.timeout ?? UNLOCK_TIMEOUT_MS,
      );
      setTimeout(() => {
        if (!isDone) child.stdin.end(`${code}\n`);
      }, ECHO_OFF_DELAY_MS);
    }

    child.stdout.on("data", read);
    child.stderr.on("data", read);
    // Never written to anything: the code could be in it if the terminal showed it.
    child.stdin.on("error", () => undefined);
    child.on("error", (error) => settle(new PassCliError(error.message, "unknown")));
    child.on("close", () => {
      if (output.includes("Session unlocked successfully")) return settle("unlocked");
      // Unlocked meanwhile, e.g. in a terminal, or its lock removed.
      if (output.includes("Session is not locked") || output.includes("Session has no lock"))
        return settle("not_locked");
      const message = failureMessage(output, code);
      const type = classifyCliError(message);
      // E.g. after too many wrong codes.
      if (type === "not_authenticated") return settle(new PassCliError("Your pass-cli session has ended.", type));
      settle(new PassCliError(message, type === "network_error" ? type : "unknown"));
    });
  });
}

/** Whether a session with a lock code is locked now: "none" once it has no lock code anymore. */
export type LockState = "locked" | "unlocked" | "none";

const LOCK_CHECK_TIMEOUT_MS = 30_000;

/** Whether checkLockState can run: on Windows, pass-cli could ask for the code in a console window of its own. */
export const canCheckLockState = (platform: NodeJS.Platform = process.platform) => platform !== "win32";

/**
 * Asks pass-cli whether the session is locked now. Its `info` only says whether the session has a lock code, and
 * answers either way. `session unlock` first asks Proton whether it's locked, and only then asks for the code, which
 * fails without a terminal, before any code is checked: no attempt counts. It runs in a session of its own, without a
 * terminal even if Raycast had one, and nothing is ever written to it.
 */
export function checkLockState(command: CommandDescriptor, options: UnlockOptions = {}): Promise<LockState> {
  return new Promise((resolve, reject) => {
    const child = spawn(command.file, [...command.args, ...UNLOCK_ARGS], { env: options.env, detached: true });
    let output = "";
    let isDone = false;
    const timer = setTimeout(() => {
      try {
        if (child.pid) process.kill(-child.pid, "SIGTERM");
      } catch {
        // Already ended.
      }
      settle(new PassCliError("pass-cli didn't say whether the session is locked.", "timeout"));
    }, options.timeout ?? LOCK_CHECK_TIMEOUT_MS);

    function settle(outcome: LockState | PassCliError) {
      if (isDone) return;
      isDone = true;
      clearTimeout(timer);
      child.stdin.destroy();
      if (outcome instanceof PassCliError) reject(outcome);
      else resolve(outcome);
    }

    const read = (chunk: Buffer) => {
      output += chunk.toString("utf8");
    };
    child.stdout.on("data", read);
    child.stderr.on("data", read);
    child.stdin.on("error", () => undefined);
    child.on("error", (error) => settle(normalizeCliExecutionError(error, command.file)));
    child.on("close", () => {
      if (output.includes("Session is not locked")) return settle("unlocked");
      if (output.includes("Session has no lock")) return settle("none");
      // pass-cli's prompt for the code, which can't show.
      if (output.includes("Error reading lock code")) return settle("locked");
      const type = classifyCliError(output);
      if (type === "not_authenticated") return settle(new PassCliError("Your pass-cli session has ended.", type));
      const message = failureMessage(output, "", "pass-cli didn't say whether the session is locked.");
      settle(new PassCliError(message, type === "network_error" ? type : "unknown"));
    });
  });
}

/** The command that unlocks the session in a terminal, for where the extension can't: PowerShell's on Windows. */
export function unlockCommandLine(cliPath: string, platform: NodeJS.Platform = process.platform): string {
  const args = UNLOCK_ARGS.join(" ");
  if (platform === "win32") return `& '${cliPath.replace(/'/g, "''")}' ${args}`;
  return `${shellQuote(cliPath)} ${args}`;
}
