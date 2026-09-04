import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Child processes get a deliberately minimal environment: this extension only ever runs
 * absolute-path system binaries, so nothing from the user's shell profile is needed and a
 * hijacked PATH cannot redirect us to an attacker-supplied `lsof` or `kill`. `LC_ALL=C`
 * keeps `ps` date formatting parseable regardless of the user's locale.
 */
const CHILD_ENV = { PATH: "/usr/sbin:/usr/bin:/bin:/sbin", LC_ALL: "C" } as const;

/** Bounds how much a misbehaving tool can make us buffer. */
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

export class CommandError extends Error {
  constructor(
    message: string,
    readonly file: string,
  ) {
    super(message);
    this.name = "CommandError";
  }
}

export class UserCancelledError extends Error {
  constructor() {
    super("Cancelled");
    this.name = "UserCancelledError";
  }
}

export interface CommandResult {
  stdout: string;
  exitCode: number;
}

interface NodeExecError {
  code?: number | string;
  stdout?: string;
  stderr?: string;
  message?: string;
}

/**
 * Runs a system binary. `execFile` is used rather than `exec` so arguments reach the
 * process through `execve` and are never parsed by a shell.
 */
export async function runCommand(file: string, args: readonly string[]): Promise<CommandResult> {
  assertAbsolutePath(file);
  assertPlainArguments(args);

  try {
    const { stdout } = await execFileAsync(file, [...args], {
      env: CHILD_ENV,
      maxBuffer: MAX_OUTPUT_BYTES,
    });
    return { stdout, exitCode: 0 };
  } catch (error) {
    const failure = error as NodeExecError;

    // A string code (ENOENT, EACCES, ...) means the binary never started.
    if (typeof failure.code !== "number") {
      throw new CommandError(failure.message ?? `Could not run ${file}`, file);
    }
    // lsof and ps exit non-zero for "nothing matched" while still producing useful output.
    if (typeof failure.stdout === "string" && failure.stdout.length > 0) {
      return { stdout: failure.stdout, exitCode: failure.code };
    }
    if (failure.stderr && failure.stderr.trim().length > 0) {
      throw new CommandError(failure.stderr.trim(), file);
    }
    return { stdout: "", exitCode: failure.code };
  }
}

/**
 * Runs a system binary behind the macOS authentication dialog.
 *
 * `do shell script` takes a single string, so the argument vector has to be reassembled by
 * hand. It is POSIX-quoted first and AppleScript-quoted second, and control characters are
 * rejected outright, so a caller cannot smuggle a second command into a root shell no
 * matter what it passes.
 */
export async function runCommandAsAdmin(file: string, args: readonly string[], prompt: string): Promise<string> {
  assertAbsolutePath(file);
  assertPlainArguments([...args, prompt]);

  const command = [file, ...args].map(shellQuote).join(" ");
  const script =
    `do shell script ${appleScriptQuote(command)} ` +
    `with prompt ${appleScriptQuote(prompt)} with administrator privileges`;

  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", script], {
      env: CHILD_ENV,
      maxBuffer: MAX_OUTPUT_BYTES,
    });
    return stdout;
  } catch (error) {
    const failure = error as NodeExecError;
    const message = `${failure.stderr ?? ""}${failure.message ?? ""}`;
    if (/User canceled|\(-128\)/i.test(message)) {
      throw new UserCancelledError();
    }
    if (typeof failure.stdout === "string" && failure.stdout.length > 0) {
      return failure.stdout;
    }
    throw new CommandError((failure.stderr ?? "Authentication failed").trim(), file);
  }
}

/** Wraps a value in single quotes - the only POSIX quoting with no escape sequences inside. */
export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

/** AppleScript string literals escape backslash and double quote, exactly like C strings. */
export function appleScriptQuote(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function assertAbsolutePath(file: string): void {
  if (!file.startsWith("/") || hasControlCharacter(file)) {
    throw new CommandError(`Refusing to run non-absolute path: ${file}`, file);
  }
}

function assertPlainArguments(args: readonly string[]): void {
  for (const arg of args) {
    if (hasControlCharacter(arg)) {
      throw new CommandError("Refusing to run a command with control characters in its arguments", "");
    }
  }
}

/**
 * Control characters have no place in the arguments this extension builds, and a newline is
 * the one character that could terminate a `do shell script` command early. Checked by code
 * point rather than by regular expression so the intent stays readable.
 */
function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}
