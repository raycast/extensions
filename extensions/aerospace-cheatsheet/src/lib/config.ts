import { getPreferenceValues } from "@raycast/api";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parse } from "smol-toml";

const exec = promisify(execFile);

/**
 * Where the `aerospace` binary might be. Homebrew on Apple Silicon, Homebrew on
 * Intel, then the app bundle itself — Raycast doesn't inherit a login shell's PATH,
 * so guessing is unavoidable.
 */
const BINARY_CANDIDATES = [
  "/opt/homebrew/bin/aerospace",
  "/usr/local/bin/aerospace",
  "/Applications/AeroSpace.app/Contents/Resources/aerospace",
];

/** Config locations AeroSpace itself checks, in its own order of preference. */
const CONFIG_CANDIDATES = [
  join(homedir(), ".aerospace.toml"),
  join(homedir(), ".config", "aerospace", "aerospace.toml"),
];

/**
 * `Preferences` is generated into raycast-env.d.ts from package.json, so it is used
 * rather than redeclared. A hand-written copy drifts from the manifest and would let a
 * preference that no longer exists still typecheck.
 */
type PreferenceName = keyof Preferences;

/** Expand a leading `~` so a preference can be written the way a person types it. */
function expandHome(path: string): string {
  return path.startsWith("~") ? join(homedir(), path.slice(1)) : path;
}

function preference(name: PreferenceName): string | undefined {
  try {
    const value = getPreferenceValues<Preferences>()[name]?.trim();
    return value ? expandHome(value) : undefined;
  } catch {
    // Preferences are unavailable outside a Raycast command context (tests, tooling).
    return undefined;
  }
}

let cachedBinary: string | null = null;

export async function aerospaceBinary(): Promise<string> {
  if (cachedBinary) return cachedBinary;

  const configured = preference("aerospacePath");
  const candidates = configured ? [configured, ...BINARY_CANDIDATES] : BINARY_CANDIDATES;

  for (const candidate of candidates) {
    try {
      await exec(candidate, ["--version"]);
      cachedBinary = candidate;
      return candidate;
    } catch {
      // try the next one
    }
  }
  throw new Error(
    configured
      ? `No aerospace binary at ${configured}, and none at the usual locations. Check the AeroSpace Binary path in this extension's preferences.`
      : "Could not find the aerospace binary. Install AeroSpace, or set its path in this extension's preferences (⌘, with this command selected).",
  );
}

export async function aerospace(...args: string[]): Promise<string> {
  const bin = await aerospaceBinary();
  const { stdout } = await exec(bin, args);
  return stdout.trim();
}

/**
 * Resolve the config path. Asking the running server is authoritative — it accounts
 * for a non-default location — but AeroSpace may not be running, so fall back to
 * probing the standard paths rather than failing outright.
 */
export async function getConfigPath(): Promise<string> {
  const configured = preference("configPath");
  if (configured) return configured;

  try {
    const reported = await aerospace("config", "--config-path");
    if (reported) return reported.startsWith("~") ? join(homedir(), reported.slice(1)) : reported;
  } catch {
    // server not running — fall through to probing
  }
  for (const candidate of CONFIG_CANDIDATES) {
    try {
      await readFile(candidate, "utf-8");
      return candidate;
    } catch {
      // try the next one
    }
  }
  throw new Error(
    "No AeroSpace config found at ~/.aerospace.toml or ~/.config/aerospace/aerospace.toml. If yours lives elsewhere, set the Config File path in this extension's preferences.",
  );
}

export interface Binding {
  /** Binding mode this lives in — "main", "service", or any custom mode. */
  mode: string;
  /** Raw toml key, e.g. `ctrl-alt-cmd-l`. */
  key: string;
  /** Command string. Multi-command bindings are joined with "; ". */
  command: string;
  /** The individual commands, for bindings that run several in sequence. */
  commands: string[];
}

interface ModeConfig {
  binding?: Record<string, string | string[]>;
}

export interface AerospaceConfig {
  mode?: Record<string, ModeConfig>;
}

export async function loadBindings(): Promise<{ bindings: Binding[]; configPath: string; raw: string }> {
  const configPath = await getConfigPath();
  const raw = await readFile(configPath, "utf-8");
  const parsed = parse(raw) as unknown as AerospaceConfig;

  const bindings: Binding[] = [];
  for (const [mode, modeConfig] of Object.entries(parsed.mode ?? {})) {
    for (const [key, value] of Object.entries(modeConfig.binding ?? {})) {
      // A typo'd config can hold a bare number or boolean (`alt-1 = 123`). Those are
      // not commands, but throwing a raw TypeError deep in normalize() told the user
      // nothing. Coerce instead: the value still shows up under "Other", exactly as
      // written, which is a far better prompt to go fix the line.
      const commands = (Array.isArray(value) ? value : [value])
        .filter((c) => c !== null && c !== undefined && c !== "")
        .map((c) => (typeof c === "string" ? c : String(c)));
      if (commands.length === 0) continue;
      bindings.push({ mode, key, command: commands.join("; "), commands });
    }
  }
  return { bindings, configPath, raw };
}

/**
 * Run a binding's command(s) against the currently focused window.
 *
 * Bindings in a non-main mode are prefixed with a `mode <name>` switch and suffixed
 * with a return to main, because their keys are only live inside that mode — running
 * the bare command would work but would leave the user's understanding of the mode
 * out of sync with what they just saw happen.
 */
/**
 * Writes new config text, and undoes it if AeroSpace rejects it.
 *
 * The caller has already re-parsed the text, so this guards the remaining failure:
 * text that is valid TOML but not a valid AeroSpace config (an unknown command, a key
 * name that does not exist). `reload-config --dry-run` is the only thing that knows
 * the difference, and it only reads from disk, so the file has to be written before it
 * can be asked. The original is held in memory and put back on rejection.
 *
 * Writing follows symlinks, which is intended: a config symlinked into a dotfiles repo
 * should be edited in place there, not replaced with a regular file.
 */
export interface SaveResult {
  /** True when AeroSpace picked the change up. */
  applied: boolean;
  /** Set when the file saved but the live reload did not take. */
  warning?: string;
}

export async function saveConfig(raw: string): Promise<SaveResult> {
  const configPath = await getConfigPath();
  const original = await readFile(configPath, "utf-8");
  if (original === raw) return { applied: true };

  await writeFile(configPath, raw, "utf-8");
  try {
    await aerospace("reload-config", "--dry-run");
  } catch (e) {
    await writeFile(configPath, original, "utf-8");
    const detail = e instanceof Error ? (e.message.trim().split("\n").pop() ?? "") : String(e);
    throw new Error(`AeroSpace rejected the change, so nothing was saved. ${detail}`);
  }

  // The config may set auto-reload-config, in which case this is redundant, and it is
  // the only thing that applies the change when it does not. Discarding a failure here
  // would report success while AeroSpace kept running the previous config, so the
  // outcome is returned instead: the file is saved and valid either way, which is why
  // this is a warning rather than a rollback.
  try {
    await aerospace("reload-config");
    return { applied: true };
  } catch (e) {
    const detail = e instanceof Error ? (e.message.trim().split("\n").pop() ?? "") : String(e);
    return { applied: false, warning: `Saved, but AeroSpace did not reload it. ${detail}` };
  }
}

/**
 * Splits a command into arguments, respecting quotes.
 *
 * A plain whitespace split breaks any command carrying a quoted argument, and
 * workspace names are allowed to contain spaces: `move-node-to-workspace -- "Design
 * Work"` became four broken arguments and the call failed. Quotes are honoured and
 * stripped, the way a shell would, without involving a shell.
 */
export function tokenise(command: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let started = false;

  for (const char of command.trim()) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      started = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (started || current) args.push(current);
      current = "";
      started = false;
      continue;
    }
    current += char;
  }
  if (started || current) args.push(current);
  return args;
}

export async function runBinding(binding: Binding): Promise<void> {
  const bin = await aerospaceBinary();
  const failures: string[] = [];
  let attempted = 0;

  for (const command of binding.commands) {
    const args = tokenise(command);
    if (args.length === 0) continue;
    // Running a shell line on the user's behalf is not this command's business.
    if (args[0] === "exec-and-forget") continue;
    attempted++;
    try {
      await exec(bin, args);
    } catch (e) {
      failures.push(e instanceof Error ? (e.message.trim().split("\n").pop() ?? command) : String(e));
    }
  }

  if (attempted === 0) {
    throw new Error("Nothing to run: this binding only shells out, which the cheatsheet does not do for you.");
  }
  // Previously every failure was swallowed, so a binding that could not run looked
  // identical to one that worked. Surface it instead.
  if (failures.length === attempted) throw new Error(failures.join("; "));
}
