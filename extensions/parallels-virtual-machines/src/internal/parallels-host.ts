import { execFile, spawn, type ExecFileException } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";
import { delimiter, join } from "node:path";
import { performance } from "node:perf_hooks";

const PARALLELS_CONSOLE_BUNDLE_ID = "com.parallels.desktop.console";
const OPEN_PATH = "/usr/bin/open";
const OSASCRIPT_PATH = "/usr/bin/osascript";
const MAX_COMMAND_OUTPUT_BYTES = 16 * 1024 * 1024;
const DEFAULT_COMMAND_TIMEOUT_MS = 15_000;

const FALLBACK_EXECUTABLE_DIRECTORIES = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/Applications/Parallels Desktop.app/Contents/MacOS",
  "/usr/bin",
  "/bin",
] as const;

const FIND_FOCUS_PROXY_JXA = `ObjC.import('AppKit');
function run(argv) {
  const targetBundleId = argv[0];
  const applications = $.NSWorkspace.sharedWorkspace.runningApplications;
  const matches = [];
  for (let index = 0; index < applications.count; index++) {
    const app = applications.objectAtIndex(index);
    const bundleId = app.bundleIdentifier;
    if (bundleId && String(bundleId.js) === targetBundleId
        && Number(app.activationPolicy) === 0) {
      matches.push(Number(app.processIdentifier));
    }
  }
  return JSON.stringify(matches);
}
`;

const ACTIVATE_JXA = `ObjC.import('AppKit');
function run(argv) {
  const pid = Number(argv[0]);
  const app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(pid);
  if (!app) {
    return 'missing';
  }
  // JXA invokes no-argument Objective-C selectors through property access.
  app.unhide;
  // 3 combines NSApplicationActivateAllWindows with
  // NSApplicationActivateIgnoringOtherApps.
  return app.activateWithOptions(3) ? 'activated' : 'refused';
}
`;

export type ParallelsHostErrorCode =
  | "executable-not-found"
  | "command-failed"
  | "command-timeout"
  | "invalid-vm-id"
  | "invalid-output"
  | "focus-proxy-ambiguous"
  | "activation-failed";

type ParallelsHostErrorDetails = Readonly<{
  command?: string;
  args?: readonly string[];
  exitCode?: number | string | null;
  signal?: NodeJS.Signals | null;
  stdout?: string;
  stderr?: string;
  timeoutMs?: number;
  vmID?: string;
  bundleID?: string;
  pids?: readonly number[];
  cause?: unknown;
}>;

export class ParallelsHostError extends Error {
  readonly code: ParallelsHostErrorCode;
  readonly details: ParallelsHostErrorDetails;

  constructor(code: ParallelsHostErrorCode, message: string, details: ParallelsHostErrorDetails = {}) {
    super(message);
    this.name = "ParallelsHostError";
    this.code = code;
    this.details = details;
  }
}

export interface ParallelsHost {
  registryJSON(): Promise<string>;
  focusProxyPID(vmID: string): Promise<number | null>;
  openVMHome(home: string): Promise<void>;
  activate(pid: number): Promise<void>;
  runPrlctl(args: string[]): Promise<void>;
  shutdown(): Promise<void>;
  now(): number;
  sleep(ms: number): Promise<void>;
}

export type MacOSParallelsHostOptions = Readonly<{
  prlctlPath?: string;
  prlsrvctlPath?: string;
  openPath?: string;
  osascriptPath?: string;
  searchPath?: string;
  commandTimeoutMs?: number;
}>;

type CommandResult = Readonly<{
  stdout: string;
  stderr: string;
}>;

function commandFailure(
  command: string,
  args: readonly string[],
  error: ExecFileException,
  stdout: string,
  stderr: string,
  timeoutMs: number,
): ParallelsHostError {
  if (error.killed) {
    return new ParallelsHostError("command-timeout", `Command timed out after ${timeoutMs}ms: ${command}`, {
      command,
      args,
      signal: error.signal,
      stdout,
      stderr,
      timeoutMs,
      cause: error,
    });
  }
  const detail = stderr.trim() || stdout.trim();
  const suffix = detail ? `: ${detail}` : "";
  const code = error.code === "ENOENT" ? "executable-not-found" : "command-failed";
  return new ParallelsHostError(code, `Command failed: ${command}${suffix}`, {
    command,
    args,
    exitCode: error.code,
    signal: error.signal,
    stdout,
    stderr,
    cause: error,
  });
}

function runFile(command: string, args: readonly string[], timeoutMs: number): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      [...args],
      {
        encoding: "utf8",
        maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
        shell: false,
        timeout: timeoutMs,
        killSignal: "SIGKILL",
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(commandFailure(command, args, error, stdout, stderr, timeoutMs));
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });
}

function runFileWithInput(
  command: string,
  args: readonly string[],
  input: string,
  timeoutMs: number,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let settled = false;
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    const rejectOnce = (error: ParallelsHostError) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    };

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
    child.on("error", (error: NodeJS.ErrnoException) => {
      rejectOnce(
        new ParallelsHostError(
          error.code === "ENOENT" ? "executable-not-found" : "command-failed",
          `Unable to execute ${command}: ${error.message}`,
          { command, args, cause: error },
        ),
      );
    });
    child.stdin.on("error", (error: NodeJS.ErrnoException) => {
      if (timedOut) return;
      rejectOnce(
        new ParallelsHostError("command-failed", `Unable to write input to ${command}: ${error.message}`, {
          command,
          args,
          cause: error,
        }),
      );
    });
    child.on("close", (exitCode, signal) => {
      if (settled) return;

      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      if (timedOut) {
        rejectOnce(
          new ParallelsHostError("command-timeout", `Command timed out after ${timeoutMs}ms: ${command}`, {
            command,
            args,
            exitCode,
            signal,
            stdout,
            stderr,
            timeoutMs,
          }),
        );
        return;
      }
      if (exitCode !== 0) {
        const detail = stderr.trim() || stdout.trim();
        const suffix = detail ? `: ${detail}` : "";
        rejectOnce(
          new ParallelsHostError("command-failed", `Command failed: ${command}${suffix}`, {
            command,
            args,
            exitCode,
            signal,
            stdout,
            stderr,
          }),
        );
        return;
      }

      settled = true;
      clearTimeout(timeout);
      resolve({ stdout, stderr });
    });

    child.stdin.end(input, "utf8");
  });
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function findExecutable(name: "prlctl" | "prlsrvctl", searchPath?: string): Promise<string> {
  const configuredDirectories = (searchPath ?? process.env.PATH ?? "")
    .split(delimiter)
    // An empty PATH entry means the current directory. Never search it for a
    // privileged desktop-management executable.
    .filter((directory) => directory.length > 0);
  const directories = [...new Set([...configuredDirectories, ...FALLBACK_EXECUTABLE_DIRECTORIES])];

  for (const directory of directories) {
    const candidate = join(directory, name);
    if (await isExecutable(candidate)) return candidate;
  }

  throw new ParallelsHostError(
    "executable-not-found",
    `Unable to find ${name}; install Parallels Desktop and make ${name} executable`,
    { command: name },
  );
}

function normalizedVMID(vmID: string): string {
  return vmID.trim().replace(/^\{/, "").replace(/\}$/, "").toLowerCase();
}

function dockHelperBundleID(vmID: string): string {
  const normalized = normalizedVMID(vmID);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(normalized)) {
    throw new ParallelsHostError("invalid-vm-id", `Invalid Parallels VM UUID: ${vmID}`, { vmID });
  }
  return `com.parallels.winapp.${normalized.replaceAll("-", "")}.VM`;
}

export class MacOSParallelsHost implements ParallelsHost {
  readonly #options: MacOSParallelsHostOptions;
  readonly #commandTimeoutMs: number;
  #prlctlPath: Promise<string> | undefined;
  #prlsrvctlPath: Promise<string> | undefined;

  constructor(options: MacOSParallelsHostOptions = {}) {
    this.#options = options;
    const commandTimeoutMs = options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    if (!Number.isFinite(commandTimeoutMs) || commandTimeoutMs <= 0) {
      throw new RangeError("commandTimeoutMs must be a positive finite number");
    }
    this.#commandTimeoutMs = commandTimeoutMs;
  }

  async registryJSON(): Promise<string> {
    const result = await runFile(
      await this.#getPrlctlPath(),
      ["list", "--all", "--json", "--info"],
      this.#commandTimeoutMs,
    );
    return result.stdout;
  }

  async focusProxyPID(vmID: string): Promise<number | null> {
    const bundleID = dockHelperBundleID(vmID);
    const { stdout } = await runFileWithInput(
      this.#options.osascriptPath ?? OSASCRIPT_PATH,
      ["-l", "JavaScript", "-", bundleID],
      FIND_FOCUS_PROXY_JXA,
      this.#commandTimeoutMs,
    );

    let rawMatches: unknown;
    try {
      rawMatches = JSON.parse(stdout.trim());
    } catch (cause) {
      throw new ParallelsHostError(
        "invalid-output",
        `Unable to parse Parallels Dock Helper result: ${stdout.trim() || "<empty>"}`,
        { vmID, bundleID, stdout, cause },
      );
    }

    if (!Array.isArray(rawMatches) || rawMatches.some((pid) => !Number.isSafeInteger(pid) || Number(pid) <= 0)) {
      throw new ParallelsHostError(
        "invalid-output",
        "Parallels Dock Helper query returned invalid process identifiers",
        { vmID, bundleID, stdout },
      );
    }

    const pids = rawMatches as number[];
    if (pids.length > 1) {
      throw new ParallelsHostError(
        "focus-proxy-ambiguous",
        `Multiple regular Parallels Dock Helpers matched VM ${normalizedVMID(vmID)}`,
        { vmID: normalizedVMID(vmID), bundleID, pids },
      );
    }
    return pids[0] ?? null;
  }

  async openVMHome(home: string): Promise<void> {
    await runFile(
      this.#options.openPath ?? OPEN_PATH,
      ["-g", "-b", PARALLELS_CONSOLE_BUNDLE_ID, home],
      this.#commandTimeoutMs,
    );
  }

  async activate(pid: number): Promise<void> {
    if (!Number.isSafeInteger(pid) || pid <= 0) {
      throw new ParallelsHostError("activation-failed", `Invalid process identifier: ${pid}`, { pids: [pid] });
    }

    const { stdout } = await runFileWithInput(
      this.#options.osascriptPath ?? OSASCRIPT_PATH,
      ["-l", "JavaScript", "-", String(pid)],
      ACTIVATE_JXA,
      this.#commandTimeoutMs,
    );
    const result = stdout.trim();
    if (result !== "activated") {
      const reason = result === "missing" ? "process disappeared" : "AppKit refused activation";
      throw new ParallelsHostError("activation-failed", `Unable to activate Parallels VM: ${reason}`, {
        pids: [pid],
        stdout,
      });
    }
  }

  async runPrlctl(args: string[]): Promise<void> {
    await runFile(await this.#getPrlctlPath(), args, this.#commandTimeoutMs);
  }

  async shutdown(): Promise<void> {
    await runFile(await this.#getPrlsrvctlPath(), ["shutdown", "-f"], this.#commandTimeoutMs);
  }

  now(): number {
    return performance.now();
  }

  sleep(ms: number): Promise<void> {
    if (!Number.isFinite(ms) || ms < 0) {
      return Promise.reject(new RangeError(`Sleep duration must be a non-negative finite number: ${ms}`));
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  #getPrlctlPath(): Promise<string> {
    this.#prlctlPath ??= this.#options.prlctlPath
      ? Promise.resolve(this.#options.prlctlPath)
      : findExecutable("prlctl", this.#options.searchPath);
    return this.#prlctlPath;
  }

  #getPrlsrvctlPath(): Promise<string> {
    this.#prlsrvctlPath ??= this.#options.prlsrvctlPath
      ? Promise.resolve(this.#options.prlsrvctlPath)
      : findExecutable("prlsrvctl", this.#options.searchPath);
    return this.#prlsrvctlPath;
  }
}

export function createMacOSParallelsHost(options: MacOSParallelsHostOptions = {}): ParallelsHost {
  return new MacOSParallelsHost(options);
}
