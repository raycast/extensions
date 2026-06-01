import { spawn, execFileSync } from "child_process";
import { existsSync } from "fs";
import * as readline from "readline";

/**
 * Bridge to the bundled `picmal-cli` binary.
 *
 * The CLI ships inside Picmal.app at `Contents/MacOS/picmal-cli` and speaks a
 * stable NDJSON protocol (one JSON object per line):
 *   - stdout: result events — `started`, `file`, `completed`
 *   - stderr: diagnostics — `error`, `warning`, `progress`
 * There is no `ok` field. Success = a `file` event + exit 0. Failure = an
 * `error` event whose `code` we map to a friendly message. We always pass
 * `--json` so the contract holds regardless of how Raycast pipes the process.
 */

const PICMAL_BUNDLE_ID = "com.cantimplorastudio.picmal";
export const PICMAL_WEBSITE = "https://picmal.app";

/** Thrown when Picmal.app (and therefore the CLI) can't be located. */
export class PicmalNotInstalledError extends Error {
  constructor() {
    super("Picmal is not installed.");
    this.name = "PicmalNotInstalledError";
  }
}

/** A produced output file, mirrored from the CLI's `file` event. */
export interface FileEvent {
  input: string;
  output: string;
  bytesIn: number;
  bytesOut: number;
  durationMs: number;
  engine: string;
}

/** A structured CLI error, mirrored from the CLI's `error` event. */
export interface CLIError {
  code: string;
  message: string;
  input?: string;
  hint?: string;
}

export interface RunResult {
  files: FileEvent[];
  /** Every per-file error emitted by the CLI (one `error` event each). */
  errors: CLIError[];
  /** Convenience alias for `errors[0]`. */
  error?: CLIError;
  exitCode: number;
}

export type Command = "convert" | "compress";

export interface ConvertArgs {
  input: string[];
  format: string;
  quality?: number;
  stripMetadata?: boolean;
  overwrite?: boolean;
}

export interface CompressArgs {
  input: string[];
  quality?: number;
  preset?: string;
  stripMetadata?: boolean;
  overwrite?: boolean;
}

/** Progress callback for long audio/video transcodes (percent is 0–100). */
export type ProgressHandler = (input: string, percent: number) => void;

let cachedCliPath: string | undefined;

/**
 * Resolve the absolute path to the picmal-cli binary, caching the result.
 * Locates Picmal.app via Spotlight on its bundle id, then derives the binary
 * path. Throws {@link PicmalNotInstalledError} if not found.
 */
export function locateCli(): string {
  if (cachedCliPath && existsSync(cachedCliPath)) return cachedCliPath;

  let appPath: string;
  try {
    appPath =
      execFileSync("mdfind", [`kMDItemCFBundleIdentifier == '${PICMAL_BUNDLE_ID}'`], {
        encoding: "utf8",
      })
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.endsWith(".app") && existsSync(line)) ?? "";
  } catch {
    appPath = "";
  }

  // Common fallback when Spotlight is disabled for /Applications.
  if (!appPath && existsSync("/Applications/Picmal.app")) {
    appPath = "/Applications/Picmal.app";
  }

  if (!appPath) throw new PicmalNotInstalledError();

  const cli = `${appPath}/Contents/MacOS/picmal-cli`;
  if (!existsSync(cli)) throw new PicmalNotInstalledError();

  cachedCliPath = cli;
  return cli;
}

/** True if Picmal.app (and its bundled CLI) can be located right now. */
export function isPicmalInstalled(): boolean {
  try {
    locateCli();
    return true;
  } catch {
    return false;
  }
}

function buildArgs(command: Command, args: ConvertArgs | CompressArgs): string[] {
  const out: string[] = [command];
  for (const path of args.input) {
    out.push("--input", path);
  }
  if (command === "convert") {
    out.push("--format", (args as ConvertArgs).format);
  } else {
    const preset = (args as CompressArgs).preset;
    if (preset) out.push("--preset", preset);
  }
  if (typeof args.quality === "number") {
    out.push("--quality", String(args.quality));
  }
  if (args.stripMetadata) out.push("--strip-metadata");
  if (args.overwrite) out.push("--overwrite");
  out.push("--json", "--quiet");
  return out;
}

/**
 * Spawn picmal-cli for `convert` or `compress`, parse its NDJSON streams, and
 * resolve a {@link RunResult}. Never rejects on a CLI-level failure — those are
 * returned in `result.error` / `result.exitCode`. Rejects only on spawn
 * failure (e.g. binary vanished mid-run).
 */
export function run(
  command: Command,
  args: ConvertArgs | CompressArgs,
  onProgress?: ProgressHandler,
): Promise<RunResult> {
  const cli = locateCli();
  const argv = buildArgs(command, args);

  return new Promise<RunResult>((resolve, reject) => {
    const child = spawn(cli, argv, { stdio: ["ignore", "pipe", "pipe"] });
    const files: FileEvent[] = [];
    const errors: CLIError[] = [];

    const stdout = readline.createInterface({ input: child.stdout });
    stdout.on("line", (line) => {
      const event = parseLine(line);
      if (event?.event === "file") {
        files.push({
          input: String(event.input),
          output: String(event.output),
          bytesIn: Number(event.bytesIn) || 0,
          bytesOut: Number(event.bytesOut) || 0,
          durationMs: Number(event.durationMs) || 0,
          engine: String(event.engine ?? "unknown"),
        });
      }
    });

    const stderr = readline.createInterface({ input: child.stderr });
    stderr.on("line", (line) => {
      const event = parseLine(line);
      if (!event) return;
      if (event.event === "error") {
        // One error event per failed file; collect them all for partial-batch reporting.
        errors.push({
          code: String(event.code ?? "unknown"),
          message: String(event.message ?? "Conversion failed."),
          input: event.input ? String(event.input) : undefined,
          hint: event.hint ? String(event.hint) : undefined,
        });
      } else if (event.event === "progress" && onProgress) {
        onProgress(String(event.input), Number(event.percent) || 0);
      }
    });

    child.on("error", reject);
    child.on("close", (code) => {
      stdout.close();
      stderr.close();
      resolve({ files, errors, error: errors[0], exitCode: code ?? -1 });
    });
  });
}

function parseLine(line: string): Record<string, unknown> | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{")) return undefined;
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/** A fully-resolved, presentation-ready description of a run. */
export interface ResultDescriptor {
  kind: "success" | "partial" | "failure";
  title: string;
  message?: string;
  /** Output to reveal with “Show in Finder”, when at least one file was produced. */
  revealPath?: string;
  /** Whether to offer an “Open Picmal” action (unlicensed / missing tooling). */
  offerGetPicmal?: boolean;
}

/**
 * Translate a {@link RunResult} into a presentation-ready {@link ResultDescriptor}.
 * Centralizes the success / partial-batch / failure tri-state and the mapping of
 * CLI error codes to friendly copy, so callers just render the descriptor.
 */
export function describeResult(result: RunResult): ResultDescriptor {
  const produced = result.files.length;
  const failed = result.errors.length;

  // Full success: files produced, nothing failed.
  if (produced > 0 && failed === 0) {
    const saved = totalSavingsPercent(result.files);
    const noun = produced === 1 ? "file" : "files";
    const savedText = saved !== undefined ? ` · saved ${saved}%` : "";
    return { kind: "success", title: `Done — ${produced} ${noun}${savedText}`, revealPath: result.files[0].output };
  }

  // Partial: some produced, some failed (CLI exit 9). Don't hide the wins.
  if (produced > 0 && failed > 0) {
    return {
      kind: "partial",
      title: `${produced} done · ${failed} failed`,
      message: failureMessage(result.error),
      revealPath: result.files[0].output,
    };
  }

  // Total failure.
  const fail = mapFailure(result.error, result.exitCode);
  return { kind: "failure", ...fail };
}

function mapFailure(error: CLIError | undefined, exitCode: number): Omit<ResultDescriptor, "kind" | "revealPath"> {
  switch (error?.code) {
    case "unlicensed":
      return {
        title: "Activate your Picmal license",
        message: error.hint ?? "Open Picmal and activate a license, then try again.",
        offerGetPicmal: true,
      };
    case "tool_missing":
      return { title: "Reinstall Picmal", message: error.hint ?? "A bundled tool is missing.", offerGetPicmal: true };
    case "output_exists":
      return { title: "Output already exists", message: "Enable “Overwrite existing files” and try again." };
    case "unsupported_format":
      return { title: "Unsupported format", message: error.message };
    case "input_missing":
      return { title: "File not found", message: error.message };
    case "input_corrupt":
      return { title: "File can’t be read", message: error.message };
    default:
      return { title: "Picmal couldn’t finish", message: error?.message ?? `Exited with code ${exitCode}.` };
  }
}

function failureMessage(error: CLIError | undefined): string | undefined {
  if (!error) return undefined;
  return error.hint ?? error.message;
}

/** Per-file outcome in an AI-tool-friendly shape. */
export interface RunSummary {
  status: ResultDescriptor["kind"];
  produced: number;
  failed: number;
  summary: string;
  outputs: { input: string; output: string; savedPercent: number | null }[];
  errors: { input?: string; message: string }[];
}

/**
 * Condense a {@link RunResult} into a flat, serializable {@link RunSummary} for
 * AI tools to read back to the user (output paths + per-file savings + errors).
 */
export function summarizeRun(result: RunResult): RunSummary {
  const described = describeResult(result);
  return {
    status: described.kind,
    produced: result.files.length,
    failed: result.errors.length,
    summary: described.message ? `${described.title} — ${described.message}` : described.title,
    outputs: result.files.map((f) => ({
      input: f.input,
      output: f.output,
      savedPercent: f.bytesIn > 0 ? Math.round(((f.bytesIn - f.bytesOut) / f.bytesIn) * 100) : null,
    })),
    errors: result.errors.map((e) => ({ input: e.input, message: e.hint ?? e.message })),
  };
}

/** Aggregate size reduction across all produced files, or undefined if unknown. */
export function totalSavingsPercent(files: FileEvent[]): number | undefined {
  const inTotal = files.reduce((sum, f) => sum + f.bytesIn, 0);
  const outTotal = files.reduce((sum, f) => sum + f.bytesOut, 0);
  if (inTotal <= 0) return undefined;
  return Math.round(((inTotal - outTotal) / inTotal) * 100);
}
