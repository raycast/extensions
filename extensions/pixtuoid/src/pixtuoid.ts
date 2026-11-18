import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
// `SourceStatus` and `OutcomeRow` are GENERATED from the Rust serde types
// (crates/pixtuoid/src/sources.rs) via committed JSON Schemas — regenerate them
// with `npm run gen:contract`.
import type { SourceStatus } from "./contract";
import type { OutcomeRow } from "./contract-outcome";
import { rowsOf } from "./conforms";
import { LaunchFailedError, launchUntilReady } from "./launch";
// Pinned against the binary by `cli_packaging`'s `the_floating_launch_contract_holds`.
import floatingLaunch from "../contract/floating-launch.json";
import outcomeRowSchema from "../contract/outcome-row.schema.json";
import sourceStatusSchema from "../contract/source-status.schema.json";

const pExecFile = promisify(execFile);

/** A row of `pixtuoid sources --json`. */
export type { SourceStatus };

/** A row of `pixtuoid connect|disconnect <id> --json`: `outcome` ∈
 *  `"connected" | "disconnected" | "failed"`, with the human detail on failure in
 *  the optional `message`. (`"no_op"` comes only from `pixtuoid sources set`,
 *  which this extension never calls.) */
export type { OutcomeRow };

/** The UI distinguishes this (offer the preference / install docs) from a
 *  runtime error. */
export class BinaryNotFoundError extends Error {
  constructor() {
    super("pixtuoid executable not found");
    this.name = "BinaryNotFoundError";
  }
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
 * `pixtuoid` lookup fails for most installs — we resolve an absolute path.
 * The preference is re-read every call so changing it + Refresh takes effect
 * immediately; only the EXPENSIVE auto-detect is memoized for the process's life.
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

/** Run pixtuoid with `args` — no shell, so a source id can never be interpreted
 *  as a shell token. */
async function runPixtuoid(args: string[]): Promise<string> {
  const bin = await resolveBinary();
  try {
    const { stdout } = await pExecFile(bin, args, { timeout: 20000 });
    return stdout;
  } catch (e) {
    // `connect`/`disconnect --json` print their outcome rows to stdout AND exit
    // non-zero when any op failed, so promisified execFile rejects — with the
    // child's stdout attached to the error. Recover that JSON array; a genuine
    // failure (missing binary, panic, non-JSON output) still rethrows.
    const stdout = (e as { stdout?: unknown }).stdout;
    if (typeof stdout === "string" && stdout.trim().startsWith("[")) {
      return stdout;
    }
    throw e;
  }
}

export async function getSources(): Promise<SourceStatus[]> {
  const out = await runPixtuoid(["sources", "--json"]);
  return rowsOf<SourceStatus>(out, sourceStatusSchema, "sources --json");
}

export async function toggleSource(id: string, connected: boolean): Promise<OutcomeRow> {
  const cmd = connected ? "disconnect" : "connect";
  const out = await runPixtuoid([cmd, id, "--json"]);
  const row = rowsOf<OutcomeRow>(out, outcomeRowSchema, `${cmd} --json`)[0];
  // An empty array means the change was NOT applied — never a silent success.
  if (!row) {
    throw new Error(`pixtuoid ${cmd} ${id} returned no outcome`);
  }
  return row;
}

/** Open `pixtuoid floating`, settling once its window is up: a boot that fails
 *  (a config error, no GPU adapter) rejects with its reason instead of passing
 *  for an open window. */
export async function startFloating(): Promise<void> {
  await launchUntilReady(await resolveBinary(), floatingLaunch.args, floatingLaunch.error_prefix);
}

/** Whether `e` is an exit with the contract's `usage_exit`: a binary too old for
 *  the launch's args rejects them so. */
export function predatesFloatingLaunch(e: unknown): boolean {
  return e instanceof LaunchFailedError && e.code === floatingLaunch.usage_exit;
}
