import { getPreferenceValues } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
// `SourceStatus` is GENERATED from the Rust serde type via a committed JSON
// Schema — no more hand-mirroring. Source of truth: crates/pixtuoid/src/sources.rs
// (its schema test emits contract/source-status.schema.json); regenerate this
// type with `npm run gen:contract`. See ../../docs/PARALLEL-DELIVERY.md.
import type { SourceStatus } from "./contract";

const pExecFile = promisify(execFile);

/** A row of `pixtuoid sources --json`. The shape is the generated, schema-backed
 *  contract above — re-exported so command UIs import it from here. */
export type { SourceStatus };

/** A row of `pixtuoid connect|disconnect <id> --json` (`run_change`).
 *  `outcome` ∈ `"connected" | "disconnected" | "failed: <msg>"` for these two
 *  single-id commands. (`run_change` also emits `"no_op"`, but only via
 *  `pixtuoid sources set` — the declarative reconcile this extension never calls.) */
export interface OutcomeRow {
  id: string;
  outcome: string;
}

/** Thrown when the pixtuoid executable can't be located — the UI distinguishes
 *  this (offer the preference / install docs) from a runtime error. */
export class BinaryNotFoundError extends Error {
  constructor() {
    super("pixtuoid executable not found");
    this.name = "BinaryNotFoundError";
  }
}

interface Preferences {
  binaryPath?: string;
}

function expandTilde(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

function isExecutable(p: string): boolean {
  try {
    accessSync(p, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

let cachedAutoDetect: string | undefined;

/**
 * Resolve the pixtuoid binary. Raycast runs extensions in a Node subprocess
 * with a MINIMAL PATH (no Homebrew / Cargo / npm-global dirs), so a bare
 * `pixtuoid` lookup fails for most installs — we resolve an absolute path:
 *   1. the `binaryPath` preference (validated), else
 *   2. the user's LOGIN SHELL `command -v pixtuoid` (their real PATH), else
 *   3. the common install locations.
 * The preference is re-read every call (synchronous + free) so changing it +
 * Refresh takes effect immediately; only the EXPENSIVE auto-detect (a login-
 * shell spawn + fs probes) is memoized for the process's life.
 */
export async function resolveBinary(): Promise<string> {
  const { binaryPath } = getPreferenceValues<Preferences>();
  if (binaryPath && binaryPath.trim()) {
    const p = expandTilde(binaryPath.trim());
    if (isExecutable(p)) return p;
    throw new BinaryNotFoundError();
  }

  if (cachedAutoDetect) return cachedAutoDetect;

  const shell = process.env.SHELL || "/bin/zsh";
  try {
    const { stdout } = await pExecFile(shell, ["-lc", "command -v pixtuoid"], {
      timeout: 5000,
    });
    const p = stdout.trim();
    if (p && isExecutable(p)) return (cachedAutoDetect = p);
  } catch {
    // Login-shell resolution failed (e.g. non-interactive guard) — fall through.
  }

  const candidates = [
    "/opt/homebrew/bin/pixtuoid",
    "/usr/local/bin/pixtuoid",
    join(homedir(), ".cargo", "bin", "pixtuoid"),
    join(homedir(), ".local", "bin", "pixtuoid"),
  ];
  for (const c of candidates) {
    if (isExecutable(c)) return (cachedAutoDetect = c);
  }

  throw new BinaryNotFoundError();
}

/** Run pixtuoid with `args` (no shell — args are passed as an array, so a
 *  source id can never be interpreted as a shell token). Returns stdout. */
async function runPixtuoid(args: string[]): Promise<string> {
  const bin = await resolveBinary();
  try {
    const { stdout } = await pExecFile(bin, args, { timeout: 20000 });
    return stdout;
  } catch (e) {
    // `connect`/`disconnect --json` print their outcome rows (INCLUDING a
    // `failed: <msg>` row) to stdout AND exit non-zero when any op failed, so
    // promisified execFile rejects — but it attaches the child's stdout to the
    // error. Recover that JSON array so the caller can render the precise
    // per-source outcome; a genuine failure (missing binary, panic, non-JSON
    // output) has no JSON-array stdout and still rethrows.
    const stdout = (e as { stdout?: unknown }).stdout;
    if (typeof stdout === "string" && stdout.trim().startsWith("[")) {
      return stdout;
    }
    throw e;
  }
}

export async function getSources(): Promise<SourceStatus[]> {
  const out = await runPixtuoid(["sources", "--json"]);
  return JSON.parse(out) as SourceStatus[];
}

/** Toggle one source: a connected source disconnects, otherwise it connects.
 *  Returns the single `OutcomeRow` the CLI emits for the id. */
export async function toggleSource(id: string, connected: boolean): Promise<OutcomeRow> {
  const cmd = connected ? "disconnect" : "connect";
  const out = await runPixtuoid([cmd, id, "--json"]);
  const rows = JSON.parse(out) as OutcomeRow[];
  const row = rows[0];
  // The CLI emits exactly one row per requested id; an empty array means the
  // change was NOT applied — surface it as an error, never a silent success.
  if (!row) {
    throw new Error(`pixtuoid ${cmd} ${id} returned no outcome`);
  }
  return row;
}

/** Spawn `pixtuoid floating` DETACHED so the desktop window outlives Raycast
 *  (which closes as soon as the no-view command returns). Resolves once the
 *  child has actually spawned; rejects on a spawn failure (ENOENT/EACCES) —
 *  without the `error` listener that failure would be an UNCATCHABLE event. */
export async function startFloating(): Promise<void> {
  const bin = await resolveBinary();
  await new Promise<void>((resolve, reject) => {
    const child = spawn(bin, ["floating"], { detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
