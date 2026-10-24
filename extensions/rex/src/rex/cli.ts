import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { serverTarget, type RexHost } from "./types";

/** Where the CLI lives inside the Rex app bundle. */
const HELPER_PATH = "Contents/Helpers/Rex Server.app/Contents/MacOS/rex";
const APP_BUNDLES = ["Rex.app", "Rex Beta.app"];

export const REX_BUNDLE_ID = "com.superlogical.rex";

export interface RexInstall {
  /** Absolute path of the rex CLI. */
  bin: string;
  /** Absolute path of the app bundle, when the CLI came from one. */
  app?: string;
}

/** Exit statuses documented by `rex`. */
export const enum RexExit {
  Ok = 0,
  Failed = 1,
  BadCommandLine = 2,
  TargetNotFound = 3,
  ServerUnreachable = 4,
}

export class RexError extends Error {
  constructor(
    message: string,
    readonly exitCode: number | null,
    readonly stderr: string,
  ) {
    super(message);
    this.name = "RexError";
  }

  get serverUnreachable(): boolean {
    return this.exitCode === RexExit.ServerUnreachable;
  }

  get remoteControlOff(): boolean {
    return /remote control/i.test(this.stderr) || /not accepting actions/i.test(this.stderr);
  }
}

function isExecutableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function appBundleOf(bin: string): string | undefined {
  const match = bin.match(/^(.*?\.app)\/Contents\//);
  return match?.[1];
}

function candidatePaths(): string[] {
  const { rexPath } = getPreferenceValues<Preferences>();
  const candidates: string[] = [];
  if (rexPath) {
    candidates.push(rexPath.endsWith(".app") ? join(rexPath, HELPER_PATH) : rexPath);
  }
  for (const dir of ["/Applications", join(homedir(), "Applications")]) {
    for (const bundle of APP_BUNDLES) candidates.push(join(dir, bundle, HELPER_PATH));
  }
  candidates.push("/opt/homebrew/bin/rex", "/usr/local/bin/rex");
  return candidates;
}

/** Find the rex CLI, honoring the "Rex CLI" preference first. */
export function locateRex(): RexInstall | undefined {
  for (const bin of candidatePaths()) {
    if (isExecutableFile(bin)) return { bin, app: appBundleOf(bin) };
  }
  return undefined;
}

export interface RunOptions {
  /** Text written to the command's stdin. */
  input?: string;
  /** Cancel a preview or refresh that is no longer needed. */
  signal?: AbortSignal;
  /** Milliseconds before the command is killed. */
  timeout?: number;
  /** Server to talk to. The local server when omitted or when `thisMachine` is set. */
  host?: RexHost;
}

/** Global `rex` flags that pick the server, as `-S LABEL` or `-S ADDRESS`. */
export function serverFlags(host?: RexHost): string[] {
  const target = serverTarget(host);
  return target ? ["-S", target] : [];
}

/** Run `rex` with the given arguments and return its stdout. */
export function runRex(install: RexInstall, args: string[], options: RunOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout ?? 10_000;
    const child = execFile(
      install.bin,
      [
        "--color",
        "never",
        "--timeout",
        `${Math.max(1, Math.round(timeout / 1000))}s`,
        ...serverFlags(options.host),
        ...args,
      ],
      { timeout: timeout + 1_000, signal: options.signal, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (!error) {
          resolve(stdout);
          return;
        }
        const code = typeof error.code === "number" ? error.code : null;
        const message = error.killed
          ? `The Rex command timed out after ${timeout / 1000} seconds.`
          : describeFailure(code, stderr, error.message);
        reject(new RexError(message, code, stderr));
      },
    );
    // execFile reports process failure; an early exit may separately close stdin with EPIPE.
    child.stdin?.on("error", () => undefined);
    if (options.input !== undefined) child.stdin?.end(options.input);
    else child.stdin?.end();
  });
}

function describeFailure(code: number | null, stderr: string, fallback: string): string {
  const detail = stderr.trim().replace(/^Error:\s*/i, "");
  if (code === RexExit.ServerUnreachable) return detail || "The Rex server could not be reached.";
  if (code === RexExit.TargetNotFound) return detail || "That session, window, or block no longer exists.";
  return detail || fallback;
}
