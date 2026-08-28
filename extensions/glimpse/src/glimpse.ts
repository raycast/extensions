// Thin wrapper around the `glimpse` CLI. Every command is run with --json, so
// this layer just resolves the binary, shells out, and surfaces errors. All the
// real work (control socket, license, auto-launch) lives in the CLI itself.

import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

// A configured path wins; otherwise point at the default install location
// (Raycast's minimal PATH won't include ~/.local/bin) and fall back to PATH.
function binaryPath(): string {
  const configured = getPreferenceValues<Preferences>().cliPath?.trim();
  if (configured) {
    return configured.startsWith("~") ? join(homedir(), configured.slice(1)) : configured;
  }
  const installed = join(homedir(), ".local", "bin", "glimpse");
  return existsSync(installed) ? installed : "glimpse";
}

// Raycast spawns Node with a stripped environment. The CLI builds its control
// socket name from USER, finds its databases via HOME, and reads the hardware
// UUID (the license key) by running `ioreg` from /usr/sbin — none of which are
// present by default, so commands fail with "not running" or "license required".
function childEnv(): NodeJS.ProcessEnv {
  const systemDirs = ["/usr/bin", "/bin", "/usr/sbin", "/sbin"];
  const path = [...new Set([...(process.env.PATH ?? "").split(":").filter(Boolean), ...systemDirs])];
  return {
    ...process.env,
    USER: process.env.USER || userInfo().username,
    HOME: process.env.HOME || homedir(),
    PATH: path.join(":"),
  };
}

export class GlimpseError extends Error {}

export async function glimpse<T>(args: string[]): Promise<T> {
  try {
    const { stdout } = await run(binaryPath(), [...args, "--json"], {
      maxBuffer: 16 * 1024 * 1024,
      env: childEnv(),
    });
    return JSON.parse(stdout) as T;
  } catch (err) {
    throw new GlimpseError(explain(err));
  }
}

function explain(err: unknown): string {
  const e = err as { code?: string; stderr?: string; message?: string };
  if (e.code === "ENOENT") {
    return "Can't find the glimpse CLI. Open Glimpse, Settings, About and click Install CLI.";
  }
  if (e.stderr) {
    try {
      const parsed = JSON.parse(e.stderr) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch {
      // stderr wasn't JSON; use it as-is.
    }
    return e.stderr.trim();
  }
  return e.message ?? "Glimpse command failed.";
}

export interface HistoryRecord {
  id: string;
  timestamp_ms: number;
  text: string;
  raw_text: string | null;
  llm_cleaned: boolean;
  speech_model: string;
  llm_model: string | null;
  mode_name: string | null;
  word_count: number;
  audio_duration_seconds: number;
  audio_path: string;
  audio_available: boolean;
  status: "success" | "error";
}

export interface ModelEntry {
  id: string;
  key: string;
  label: string;
  remote: boolean;
  installed: boolean;
  active: boolean;
}
