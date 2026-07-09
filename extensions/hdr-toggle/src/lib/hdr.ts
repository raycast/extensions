import { execFile } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { environment } from "@raycast/api";

const execFileAsync = promisify(execFile);

/** One HDR-capable monitor, as reported by assets/hdr.ps1. */
export interface Monitor {
  /** Stable monitor device path (e.g. \\?\DISPLAY#...). Used to target set/toggle. */
  id: string;
  /** Friendly name (e.g. "AW2725Q"), or "Display N" fallback. */
  name: string;
  supported: boolean;
  enabled: boolean;
  /** Which DisplayConfig API reported state: "hdr" (24H2+) or "advancedColor" (legacy). */
  api?: string;
}

interface ErrorShape {
  error: string;
}

const SCRIPT_PATH = join(environment.assetsPath, "hdr.ps1");

/**
 * Run the bundled PowerShell helper with the given verb/args and return parsed stdout.
 * The helper prints `{ "error": "..." }` and exits non-zero on failure; we surface that
 * as a thrown Error so callers can show a toast.
 */
async function runHelper<T>(args: string[]): Promise<T> {
  const psArgs = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    SCRIPT_PATH,
    ...args,
  ];

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("powershell.exe", psArgs, {
      windowsHide: true,
    }));
  } catch (err: unknown) {
    // Non-zero exit still carries the JSON error payload on stdout. Parse it
    // separately so only a JSON.parse failure is swallowed, not the error we throw.
    const out = (err as { stdout?: string })?.stdout?.trim();
    if (out) {
      let parsed: ErrorShape | undefined;
      try {
        parsed = JSON.parse(out) as ErrorShape;
      } catch {
        parsed = undefined; // not JSON; fall through to the generic error below
      }
      if (parsed?.error) throw new Error(parsed.error);
    }
    throw err instanceof Error ? err : new Error(String(err));
  }

  const trimmed = stdout.trim();
  const parsed = JSON.parse(trimmed) as T | ErrorShape;
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    throw new Error((parsed as ErrorShape).error);
  }
  return parsed as T;
}

/** Enumerate HDR-capable monitors and their current state. */
export function listMonitors(): Promise<Monitor[]> {
  return runHelper<Monitor[]>(["list"]);
}

/** Set HDR on a single monitor. Resolves to the new enabled state. */
export async function setHdr(id: string, enabled: boolean): Promise<boolean> {
  const res = await runHelper<{ id: string; enabled: boolean }>([
    "set",
    "-Id",
    id,
    "-State",
    enabled ? "on" : "off",
  ]);
  return res.enabled;
}

/** Invert HDR on a single monitor. Resolves to the new enabled state. */
export async function toggleHdr(id: string): Promise<boolean> {
  const res = await runHelper<{ id: string; enabled: boolean }>([
    "toggle",
    "-Id",
    id,
  ]);
  return res.enabled;
}
