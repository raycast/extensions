import { getPreferenceValues } from "@raycast/api";
import { execFile, execFileSync } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { join } from "node:path";
import { joinOptionValues } from "./args";
import { registryPathValue, windowsSearchDirs } from "./cliPath";
import { coalescing } from "./coalesce";

export const IS_WINDOWS = process.platform === "win32";

// Raycast extensions on macOS inherit a minimal PATH without /usr/local/bin,
// where Spark CLI Setup links `spark`, so the binary is used by absolute path.
const MAC_PATH = "/usr/local/bin/spark";

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;

export type SparkErrorKind = "notInstalled" | "outdated" | "notRunning" | "accessDenied" | "command";

export class SparkError extends Error {
  readonly kind: SparkErrorKind;

  constructor(kind: SparkErrorKind, message: string) {
    super(message);
    this.name = "SparkError";
    this.kind = kind;
  }
}

export interface RunOptions {
  timeout?: number;
  signal?: AbortSignal;
}

export function sparkPath(): string {
  const { sparkPath: configured } = getPreferenceValues<Preferences>();
  const path = configured?.trim() || (IS_WINDOWS ? windowsCLI() : MAC_PATH);
  try {
    if (!path) throw new Error("not found");
    accessSync(path, constants.X_OK);
    return path;
  } catch {
    throw new SparkError(
      "notInstalled",
      "Spark CLI not found. In Spark, open Settings → AI Agents → Spark CLI Setup, or set the CLI path in the extension preferences.",
    );
  }
}

let foundWindowsCLI: string | undefined;

/// `spark.exe` in the first folder of the user's PATH that has it. Found once
/// per session; until then every call looks again, so turning on Spark CLI
/// Setup takes effect without restarting Raycast.
function windowsCLI(): string | undefined {
  if (foundWindowsCLI) return foundWindowsCLI;
  for (const dir of windowsSearchDirs(process.env.PATH ?? process.env.Path, userRegistryPath())) {
    const candidate = join(dir, "spark.exe");
    try {
      accessSync(candidate, constants.F_OK);
      foundWindowsCLI = candidate;
      return candidate;
    } catch {
      // Not in this folder.
    }
  }
  return undefined;
}

function userRegistryPath(): string | undefined {
  try {
    const output = execFileSync("reg", ["query", "HKCU\\Environment", "/v", "Path"], {
      encoding: "utf8",
      timeout: 5_000,
      windowsHide: true,
    });
    return registryPathValue(output, process.env);
  } catch {
    return undefined;
  }
}

/// Runs `spark <args> --json` and resolves with the decoded result. Every call
/// announces itself as Spark's own extension through SPARK_CALLER_APP: Spark
/// applies the same per-account access levels as for any caller, records the
/// writes in its agent activity, and leaves out the reads the user makes by
/// browsing here.
///
/// With `--json` a failure is printed as `{"error": {"message": …}}` on stdout
/// before a non-zero exit - including not reaching Spark Desktop at all.
export function sparkJSON<T>(args: string[], options: RunOptions = {}): Promise<T> {
  const file = sparkPath();
  // A caller that can cancel keeps its own request: sharing it would let one
  // caller's cancel fail the others.
  if (options.signal || !READ_COMMANDS.has(args[0])) return run(file, args, options);
  return shared(JSON.stringify([file, args, options.timeout]), () => run(file, args, options)) as Promise<T>;
}

/// Commands that only read. Raycast mounts a locally installed command twice
/// (React's StrictMode), so each of its reads would otherwise reach Spark twice
/// at once - and a listing can take Spark seconds.
const READ_COMMANDS = new Set([
  "accounts",
  "availability",
  "contact",
  "contacts",
  "emails",
  "events",
  "folders",
  "meeting",
  "meetings",
  "search",
  "template",
  "templates",
  "thread",
]);

const shared = coalescing<unknown>();

function run<T>(file: string, args: string[], options: RunOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      [...joinOptionValues(args), "--json"],
      {
        timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_BYTES,
        // On Windows, no console window flashes up for each call.
        windowsHide: true,
        signal: options.signal,
        env: { ...process.env, SPARK_CALLER_APP: "raycast-extension" },
      },
      (error, stdout, stderr) => {
        if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT") {
          reject(new SparkError("notInstalled", `Spark CLI not found at ${file}.`));
          return;
        }
        const decoded = decode(stdout);
        if (decoded === undefined) {
          reject(undecodable(error, stdout, stderr));
          return;
        }
        if (isErrorPayload(decoded)) {
          reject(classifyError(decoded.error.message));
          return;
        }
        if (error) {
          reject(classifyError(stderr.trim() || error.message));
          return;
        }
        resolve(decoded as T);
      },
    );
  });
}

function decode(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed.startsWith("{")) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function isErrorPayload(value: unknown): value is { error: { message: string } } {
  const error = (value as { error?: { message?: unknown } } | null)?.error;
  return typeof error?.message === "string";
}

/// Output that isn't JSON: a CLI from before `--json` rejects the flag, and an
/// app from before it ignores the flag and answers in text.
function undecodable(error: Error | null, stdout: string, stderr: string): SparkError {
  if (
    /unknown option '--json'|unexpected argument '--json'/i.test(`${stderr}\n${stdout}`) ||
    (!error && stdout.trim())
  ) {
    return new SparkError("outdated", "This version of Spark is too old for the extension. Update Spark Desktop.");
  }
  return classifyError(stderr.trim() || stdout.trim() || error?.message || "The Spark CLI failed.");
}

const NOT_RUNNING =
  "Can't reach Spark Desktop. Make sure it's running and Spark CLI is enabled in Settings → AI Agents.";

export function classifyError(raw: string): SparkError {
  const message = raw.replace(/^Error:\s*/, "").trim();
  // Release builds word every connection failure the same way; development
  // builds name the cause.
  if (
    /can't access your spark desktop|cannot connect to spark desktop|connection to spark desktop failed|not responding/i.test(
      message,
    )
  ) {
    return new SparkError("notRunning", NOT_RUNNING);
  }
  if (/took too long to respond/i.test(message)) {
    return new SparkError("notRunning", "Spark Desktop took too long to respond. Try again.");
  }
  if (
    /to change access levels, open spark desktop|does not have (triage|send) access|access is disabled|not enabled for cli access/i.test(
      message,
    )
  ) {
    return new SparkError("accessDenied", message);
  }
  return new SparkError("command", message);
}
