/**
 * Thin wrapper over the `outl` CLI.
 *
 * Every command in this extension shells out to `outl --workspace <ws>
 * <subcommand> ... --json` and parses the JSON envelope the CLI emits.
 * No outliner logic is reimplemented here — this file only spawns the
 * binary, reads back the envelope, and turns failures into typed errors.
 *
 * The envelope contract (see `crates/outl-cli/src/output.rs`):
 *
 *   { "ok": true,  "data": { ... }, "error": null }
 *   { "ok": false, "data": null,    "error": { "code": "X", "message": "..." } }
 *
 * We pass every argument as an array element to `execFile` (never a
 * shell string) so a query like `rm -rf` or `"; drop` is just text.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);

/** Raycast preferences declared in package.json. */
export interface Preferences {
  workspace: string;
  outlBin?: string;
}

/** The error half of the CLI envelope. */
export interface ApiError {
  code: string;
  message: string;
}

/** The full JSON envelope every machine-shaped subcommand returns. */
interface Envelope<T> {
  ok: boolean;
  data: T | null;
  error: ApiError | null;
}

/**
 * Raised whenever the CLI cannot be run or returns an error envelope.
 * `code` mirrors the CLI's stable error codes (NO_WORKSPACE,
 * PAGE_NOT_FOUND, ...) or a local code when the failure is on our side
 * (BINARY_NOT_FOUND, BAD_OUTPUT, NO_WORKSPACE_PREF).
 */
export class OutlError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "OutlError";
    this.code = code;
  }
}

/** Read + validate the workspace / binary preferences. */
export function readPreferences(): { workspace: string; bin: string } {
  const prefs = getPreferenceValues<Preferences>();
  const workspace = (prefs.workspace ?? "").trim();
  if (workspace === "") {
    throw new OutlError(
      "NO_WORKSPACE_PREF",
      "No workspace set. Open the extension preferences and point it at your outl workspace folder.",
    );
  }
  const bin = (prefs.outlBin ?? "").trim() || "outl";
  return { workspace, bin };
}

/**
 * Run `outl --workspace <ws> <args...> --json` and return the parsed
 * `data` payload.
 *
 * `args` must NOT include `--workspace`, the binary, or `--json` — this
 * helper injects all three. The query / text values go in as plain
 * array elements; they are never interpolated into a shell string.
 */
export async function runOutl<T>(args: string[]): Promise<T> {
  const { workspace, bin } = readPreferences();
  const fullArgs = ["--workspace", workspace, ...args, "--json"];

  let stdout: string;
  try {
    const result = await execFileAsync(bin, fullArgs, {
      maxBuffer: 16 * 1024 * 1024,
    });
    stdout = result.stdout;
  } catch (err: unknown) {
    // execFile rejects on a non-zero exit code too. The CLI still
    // prints a JSON error envelope on stdout in that case (exit 1/2),
    // so try to parse it before giving up.
    const e = err as { code?: string; stdout?: string; message?: string };
    if (e.code === "ENOENT") {
      throw new OutlError(
        "BINARY_NOT_FOUND",
        `Could not find the outl binary at "${bin}". Set an absolute path in the extension preferences (Raycast often lacks your shell PATH).`,
      );
    }
    if (typeof e.stdout === "string" && e.stdout.trim() !== "") {
      return parseEnvelope<T>(e.stdout);
    }
    throw new OutlError("EXEC_FAILED", e.message ?? "outl invocation failed");
  }

  return parseEnvelope<T>(stdout);
}

/** Parse a raw stdout string into the envelope's `data`, or throw. */
function parseEnvelope<T>(stdout: string): T {
  let env: Envelope<T>;
  try {
    env = JSON.parse(stdout) as Envelope<T>;
  } catch {
    throw new OutlError(
      "BAD_OUTPUT",
      `outl did not return valid JSON:\n${stdout.slice(0, 500)}`,
    );
  }

  if (!env.ok || env.error) {
    const apiErr = env.error ?? { code: "UNKNOWN", message: "unknown error" };
    throw new OutlError(apiErr.code, apiErr.message);
  }

  if (env.data === null || env.data === undefined) {
    throw new OutlError("BAD_OUTPUT", "outl returned an empty success payload");
  }

  return env.data;
}
