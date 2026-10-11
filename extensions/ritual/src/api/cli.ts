import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type RunResult = { stdout: string; stderr: string };
export type Runner = (bin: string, args: string[]) => Promise<RunResult>;

/// A failure carrying a message worth showing a person. `kind` is what lets a
/// view decide between an empty state and a toast: a missing binary is a setup
/// problem, everything else is an error about one action.
export class RitualCliError extends Error {
  readonly kind: "missing" | "denied" | "failed";

  constructor(message: string, kind: RitualCliError["kind"] = "failed") {
    super(message);
    this.name = "RitualCliError";
    this.kind = kind;
  }
}

/// Where `ritual` is looked for, in order.
///
/// **Never probe `Contents/MacOS/` inside Ritual.app.** That exact path —
/// `/Applications/Ritual.app/Contents/MacOS/ritual` — was the first candidate
/// here once, on the theory that a future Direct Distribution build would
/// embed the CLI there. macOS filesystems are case-INSENSITIVE, so that path
/// resolves to `Contents/MacOS/Ritual`, the menu bar GUI app itself. It is
/// executable, so `fileExists` accepted it, and every command the extension
/// ran launched a copy of the Mac app as a subprocess that never exited: 28
/// invisible instances accumulated in one session, and every list hung
/// forever waiting for output that was never coming.
///
/// The CLI is now embedded instead at `Contents/Helpers/ritual` — a path that
/// cannot collide with anything Xcode generates for the bundle, unlike
/// `Contents/MacOS/`, which always holds the app's own executable named for
/// the bundle (case-insensitively). Do not "tidy" this back into
/// `Contents/MacOS/`.
export const CANDIDATE_PATHS = [
  "/Applications/Ritual.app/Contents/Helpers/ritual",
  join(homedir(), "bin", "ritual"),
  "/usr/local/bin/ritual",
  "/opt/homebrew/bin/ritual",
];

export function fileExists(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/// An override that loses to discovery would not be an override, so a
/// preference that names a real file wins outright.
export function discoverBinary(
  override: string | undefined,
  exists: (path: string) => boolean = fileExists,
  candidates: string[] = CANDIDATE_PATHS,
): string | undefined {
  const manual = override?.trim();
  if (manual && exists(manual)) return manual;
  return candidates.find(exists);
}

/// swift-argument-parser stops recognizing flags once past a `--` terminator,
/// so `--json` must be inserted BEFORE it. Appending would make the CLI read
/// "--json" as a second positional and fail.
export function withJSON(args: string[]): string[] {
  const terminator = args.indexOf("--");
  const flags = terminator === -1 ? args : args.slice(0, terminator);
  if (flags.includes("--json")) return args;
  if (terminator === -1) return [...args, "--json"];
  return [...args.slice(0, terminator), "--json", ...args.slice(terminator)];
}

/// The CLI runs no sync engine. When the Mac app isn't running it notes the
/// queue depth on stderr and exits 0 — a success nobody should read as "it's
/// on my phone now".
export function pendingSyncNote(stderr: string): string | undefined {
  const match = /ritual:\s*(\d+ changes? waiting to sync)/.exec(stderr);
  return match?.[1];
}

const defaultRunner: Runner = (bin, args) => execFileAsync(bin, args);

export type Cli = {
  bin: string;
  run(args: string[]): Promise<RunResult>;
  json<T>(args: string[]): Promise<T>;
  list<T>(args: string[]): Promise<T[]>;
};

export function makeCli(bin: string, run: Runner = defaultRunner): Cli {
  function describe(error: unknown): RitualCliError {
    const err = error as NodeJS.ErrnoException & { stderr?: string };
    if (err?.code === "ENOENT") {
      return new RitualCliError(
        `Ritual's command-line tool wasn't found at ${bin}.`,
        "missing",
      );
    }
    if (err?.code === "EACCES") {
      return new RitualCliError(
        `${bin} isn't executable. Try: chmod +x ${bin}`,
        "denied",
      );
    }
    // The CLI writes diagnostics a person can read — schema skew, a missing
    // store, an unknown id. Prefer them over node's wrapper.
    const stderr = err?.stderr?.trim();
    if (stderr) return new RitualCliError(stderr.replace(/^ritual:\s*/, ""));
    return new RitualCliError(err?.message ?? String(error));
  }

  const cli: Cli = {
    bin,
    async run(args) {
      try {
        const { stdout, stderr } = await run(bin, args);
        return { stdout, stderr: stderr ?? "" };
      } catch (error) {
        throw describe(error);
      }
    },
    async json<T>(args: string[]) {
      const { stdout } = await cli.run(withJSON(args));
      try {
        return JSON.parse(stdout) as T;
      } catch {
        throw new RitualCliError(
          `Ritual returned unreadable output for \`${args.join(" ")}\`.`,
        );
      }
    },
    async list<T>(args: string[]) {
      const value = await cli.json<T[]>(args);
      if (!Array.isArray(value)) {
        throw new RitualCliError(`Expected a list from \`${args.join(" ")}\`.`);
      }
      return value;
    },
  };
  return cli;
}
