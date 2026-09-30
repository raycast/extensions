// Thin wrapper around the `glimpse` CLI. Every command is run with --json, so
// this layer just resolves the binary, shells out, and surfaces errors. All the
// real work (control socket, license, auto-launch) lives in the CLI itself.

import { getPreferenceValues } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export const isWindows = process.platform === "win32";

// Microsoft Store build of Glimpse.
const STORE_PACKAGE = "GaronG.GlimpseDictation_d9bcdxmjhaq50";
const STORE_CLI_ALIAS = "glimpse-cli.exe";

// A configured path wins; otherwise point at the default install location
// (Raycast's minimal PATH won't include ~/.local/bin) and fall back to PATH.
function binaryPath(): string {
  const configured = getPreferenceValues<Preferences>().cliPath?.trim();
  if (configured) {
    const path = configured.startsWith("~") ? join(homedir(), configured.slice(1)) : configured;
    return isWindows ? windowsTarget(path) : path;
  }
  if (isWindows) return windowsBinaryPath();
  const installed = join(homedir(), ".local", "bin", "glimpse");
  return existsSync(installed) ? installed : "glimpse";
}

// Windows installs a glimpse.cmd shim. Node can't run .cmd files without a
// shell, so run the executable the shim points at instead.
function windowsBinaryPath(): string {
  const shim = join(homedir(), ".local", "bin", "glimpse.cmd");
  if (existsSync(shim)) return windowsTarget(shim);
  const alias = storeAliasPath();
  return existsSync(alias) ? alias : STORE_CLI_ALIAS;
}

function windowsTarget(path: string): string {
  if (!path.toLowerCase().endsWith(".cmd")) return path;
  let target: string | undefined;
  try {
    target = readFileSync(path, "utf8")
      .split(/\r?\n/)
      .find((line) => line.startsWith("REM glimpse-cli-target="))
      ?.slice("REM glimpse-cli-target=".length)
      .trim();
  } catch {
    // Unreadable shim; fall through to the Store alias.
  }
  if (!target || target.toLowerCase() === STORE_CLI_ALIAS) return storeAliasPath();
  return target;
}

function storeAliasPath(): string {
  return join(localAppData(), "Microsoft", "WindowsApps", STORE_CLI_ALIAS);
}

function localAppData(): string {
  return process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
}

// Raycast spawns Node with a stripped environment. On macOS the CLI builds its
// control socket name from USER, finds its databases via HOME, and reads the
// hardware UUID (the license key) by running `ioreg` from /usr/sbin. On Windows
// it needs USERNAME for the pipe name and APPDATA for its databases. None of
// those are present by default, so commands fail with "not running" or
// "license required".
function childEnv(): NodeJS.ProcessEnv {
  // Tells Glimpse's usage analytics the command came from Raycast.
  const client = { GLIMPSE_CLIENT: "raycast" };
  if (isWindows) {
    const home = process.env.USERPROFILE || homedir();
    return {
      ...process.env,
      ...client,
      USERNAME: process.env.USERNAME || userInfo().username,
      USERPROFILE: home,
      APPDATA: process.env.APPDATA || join(home, "AppData", "Roaming"),
      LOCALAPPDATA: localAppData(),
      SystemRoot: process.env.SystemRoot || "C:\\Windows",
      // Makes Glimpse.exe run as the CLI, like the glimpse.cmd shim does.
      GLIMPSE_CLI_SHIM: "1",
    };
  }
  const systemDirs = ["/usr/bin", "/bin", "/usr/sbin", "/sbin"];
  const path = [...new Set([...(process.env.PATH ?? "").split(":").filter(Boolean), ...systemDirs])];
  return {
    ...process.env,
    ...client,
    USER: process.env.USER || userInfo().username,
    HOME: process.env.HOME || homedir(),
    PATH: path.join(":"),
  };
}

export type GlimpseErrorKind = "missing_cli" | "not_running" | "license" | "outdated" | "other";

export class GlimpseError extends Error {
  constructor(
    message: string,
    readonly kind: GlimpseErrorKind = "other",
  ) {
    super(message);
  }
}

export async function glimpse<T>(args: string[]): Promise<T> {
  try {
    const { stdout } = await run(binaryPath(), [...args, "--json"], {
      maxBuffer: 16 * 1024 * 1024,
      env: childEnv(),
      windowsHide: true,
    });
    return JSON.parse(stdout) as T;
  } catch (err) {
    throw explain(err);
  }
}

// Opens the Glimpse app directly, so it works without the CLI.
export async function openGlimpseApp(): Promise<void> {
  if (!isWindows) {
    await run("/usr/bin/open", ["-b", "com.glimpse.data"]);
    return;
  }
  if (existsSync(join(localAppData(), "Packages", STORE_PACKAGE))) {
    // explorer.exe exits with 1 even when the launch works, so don't wait on it.
    detached("explorer.exe", [`shell:AppsFolder\\${STORE_PACKAGE}!Glimpse`]);
    return;
  }
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const exe = [join(localAppData(), "Glimpse", "Glimpse.exe"), join(programFiles, "Glimpse", "Glimpse.exe")].find(
    existsSync,
  );
  if (!exe) throw new Error("Glimpse isn't installed.");
  detached(exe, []);
}

function detached(command: string, args: string[]) {
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.on("error", () => undefined);
  child.unref();
}

function explain(err: unknown): GlimpseError {
  const e = err as { code?: string; stderr?: string; message?: string };
  if (e.code === "ENOENT") {
    return new GlimpseError(
      "Can't find the glimpse CLI. Open Glimpse, Settings, About and click Install CLI.",
      "missing_cli",
    );
  }
  // Older CLIs reject newer commands (like record) with a usage error.
  if (e.stderr?.includes("unrecognized subcommand")) {
    return new GlimpseError("This needs Glimpse 1.2.0 or later. Update Glimpse and try again.", "outdated");
  }
  const message = cliMessage(e) ?? e.message ?? "Glimpse command failed.";
  return new GlimpseError(message, kindOf(message));
}

function cliMessage(e: { stderr?: string }): string | undefined {
  if (!e.stderr) return undefined;
  try {
    const parsed = JSON.parse(e.stderr) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    // stderr wasn't JSON; use it as-is.
  }
  return e.stderr.trim() || undefined;
}

// Matches the CLI's own wording for these failures.
function kindOf(message: string): GlimpseErrorKind {
  if (/license is required/i.test(message)) return "license";
  if (/not running|must be running|did not finish starting up/i.test(message)) return "not_running";
  return "other";
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

export interface RecordStatus {
  app_running: boolean;
  status: "idle" | "recording" | "paused" | "saving";
  elapsed_ms?: number;
  mic?: boolean;
  system?: "none" | "all" | "app";
  bookmarks?: number;
}
