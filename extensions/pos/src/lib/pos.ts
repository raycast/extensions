import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

export type { Focus, StatusRow, PosCommand } from "./palette";

const pExecFile = promisify(execFile);

interface Prefs {
  posBin?: string;
}

let _binCache: string | null = null;

/**
 * Resolve the absolute path to the `pos` binary.
 *
 * Raycast runs with a minimal PATH, so a bare "pos" rarely resolves. We honour
 * an explicit preference, otherwise ask a login shell where `pos` lives (picks
 * up ~/.local/bin etc.), otherwise probe the usual install locations.
 */
export async function resolvePosBin(): Promise<string> {
  if (_binCache) return _binCache;

  const pref = getPreferenceValues<Prefs>().posBin?.trim();
  if (pref) {
    _binCache = pref;
    return pref;
  }

  try {
    const { stdout } = await pExecFile("/bin/zsh", ["-lc", "command -v pos"]);
    const found = stdout.trim().split("\n").pop()?.trim();
    if (found) {
      _binCache = found;
      return found;
    }
  } catch {
    // fall through to probing
  }

  const home = process.env.HOME ?? "";
  for (const cand of [
    `${home}/.local/bin/pos`,
    "/opt/homebrew/bin/pos",
    "/usr/local/bin/pos",
  ]) {
    if (existsSync(cand)) {
      _binCache = cand;
      return cand;
    }
  }

  _binCache = "pos";
  return "pos";
}

/** Run a pos command and parse its JSON output (stdout is not a TTY → JSON). */
export async function runPosJSON<T>(args: string[]): Promise<T> {
  const bin = await resolvePosBin();
  const { stdout } = await pExecFile(bin, args, {
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(stdout) as T;
}

/** Run a mutating pos command; returns its combined stdout/stderr text. Throws on non-zero exit. */
export async function runPosAction(args: string[]): Promise<string> {
  const bin = await resolvePosBin();
  const { stdout, stderr } = await pExecFile(bin, args, {
    maxBuffer: 16 * 1024 * 1024,
  });
  return (stdout || stderr || "").trim();
}
