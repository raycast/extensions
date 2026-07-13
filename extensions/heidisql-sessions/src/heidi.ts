import { execFile, spawn } from "child_process";
import { constants } from "fs";
import { access, readdir, readFile } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { psQuote, queryRegistry, readRegistryValue } from "./registry";

const execFileAsync = promisify(execFile);

const IS_MAC = process.platform === "darwin";

const EXE_NAME = "heidisql.exe";

/** A single HeidiSQL connection profile. */
export interface HeidiSession {
  /**
   * The session identifier as HeidiSQL knows it. For sessions organized in
   * folders this is the full path under `Servers\`, e.g. `Work\Prod DB`,
   * using a backslash as the separator on every platform (that is HeidiSQL's
   * own session-tree delimiter). This exact value is passed to HeidiSQL as
   * `-d "<identifier>"`.
   */
  identifier: string;
  /** Database family derived from HeidiSQL's persisted `NetType` value. */
  databaseType?: HeidiDatabaseType;
}

export type HeidiDatabaseType = "mysql" | "mssql" | "postgresql" | "sqlite" | "proxysql" | "interbase" | "firebird";

/**
 * HeidiSQL persists `TNetType` as its zero-based Delphi enum value. Keep this
 * mapping in sync with `source/dbstructures.pas` in the HeidiSQL repository.
 */
function databaseTypeFromNetType(netType: number | undefined): HeidiDatabaseType | undefined {
  switch (netType) {
    case 0: // MySQL TCP/IP
    case 1: // MySQL named pipe
    case 2: // MySQL SSH tunnel
    case 16: // MySQL on Amazon RDS
      return "mysql";
    case 3: // Microsoft SQL Server named pipe
    case 4: // Microsoft SQL Server TCP/IP
    case 5: // Microsoft SQL Server SPX/IPX
    case 6: // Microsoft SQL Server Banyan VINES
    case 7: // Microsoft SQL Server Windows RPC
      return "mssql";
    case 8: // PostgreSQL TCP/IP
    case 9: // PostgreSQL SSH tunnel
      return "postgresql";
    case 10: // SQLite
    case 17: // SQLite encrypted
      return "sqlite";
    case 11: // ProxySQL Admin
      return "proxysql";
    case 12: // InterBase TCP/IP
    case 13: // InterBase local
      return "interbase";
    case 14: // Firebird TCP/IP
    case 15: // Firebird local
      return "firebird";
    default:
      return undefined;
  }
}

async function fileExists(candidate: string): Promise<boolean> {
  try {
    await access(candidate, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Looks for `heidisql.exe` in each directory on the PATH environment variable. */
async function findOnPath(): Promise<string | undefined> {
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    const candidate = path.join(dir, EXE_NAME);
    if (await fileExists(candidate)) return candidate;
  }
  return undefined;
}

/** Looks for a Scoop-installed HeidiSQL, in both user and global Scoop roots. */
async function findInScoop(): Promise<string | undefined> {
  const roots = [
    process.env.SCOOP,
    path.join(os.homedir(), "scoop"),
    process.env.SCOOP_GLOBAL,
    path.join(process.env.ProgramData ?? "C:\\ProgramData", "scoop"),
  ].filter((root): root is string => Boolean(root));

  for (const root of roots) {
    const candidate = path.join(root, "apps", "heidisql", "current", EXE_NAME);
    if (await fileExists(candidate)) return candidate;
  }
  return undefined;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** Strips a trailing icon index from a DisplayIcon path, e.g. `app.exe,0` -> `app.exe`. */
function stripIconIndex(value: string): string {
  const commaIndex = value.lastIndexOf(",");
  if (commaIndex > 0 && /^-?\d+$/.test(value.slice(commaIndex + 1).trim())) {
    return value.slice(0, commaIndex).trim();
  }
  return value;
}

// HeidiSQL is installed by an Inno Setup installer, which records its uninstall
// info (including the install location) under this key across the possible hives
// and registry views (64-bit HKLM, 32-bit WOW6432Node, and per-user HKCU).
const UNINSTALL_KEYS = [
  "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\HeidiSQL_is1",
  "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\HeidiSQL_is1",
  "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\HeidiSQL_is1",
];

/** Finds HeidiSQL via its uninstall registry entry. */
async function findInRegistry(): Promise<string | undefined> {
  for (const key of UNINSTALL_KEYS) {
    // DisplayIcon usually points straight at the executable.
    const displayIcon = await readRegistryValue(key, "DisplayIcon");
    if (displayIcon) {
      const exe = stripIconIndex(unquote(displayIcon));
      if (exe.toLowerCase().endsWith(EXE_NAME) && (await fileExists(exe))) return exe;
    }
    // Otherwise fall back to InstallLocation + the executable name.
    const installLocation = await readRegistryValue(key, "InstallLocation");
    if (installLocation) {
      const exe = path.join(unquote(installLocation), EXE_NAME);
      if (await fileExists(exe)) return exe;
    }
  }
  return undefined;
}

/** Resolves a `.lnk` shortcut's target path via the WScript.Shell COM object. */
async function resolveShortcut(lnkPath: string): Promise<string | undefined> {
  const psPath = "'" + lnkPath.replace(/'/g, "''") + "'";
  try {
    const { stdout } = await execFileAsync(
      "powershell",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `(New-Object -ComObject WScript.Shell).CreateShortcut(${psPath}).TargetPath`,
      ],
      { windowsHide: true },
    );
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Finds HeidiSQL via its Start Menu shortcut (all-users and per-user). */
async function findInStartMenu(): Promise<string | undefined> {
  const roots = [
    process.env.ProgramData && path.join(process.env.ProgramData, "Microsoft", "Windows", "Start Menu", "Programs"),
    process.env.APPDATA && path.join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs"),
  ].filter((root): root is string => Boolean(root));

  for (const root of roots) {
    const lnk = path.join(root, "HeidiSQL", "HeidiSQL.lnk");
    if (!(await fileExists(lnk))) continue;
    const target = await resolveShortcut(lnk);
    if (target && target.toLowerCase().endsWith(EXE_NAME) && (await fileExists(target))) return target;
  }
  return undefined;
}

/**
 * Finds where HeidiSQL is actually installed, first via the uninstall registry
 * entry and then via its Start Menu shortcut.
 */
async function findInstalledLocation(): Promise<string | undefined> {
  return (await findInRegistry()) ?? (await findInStartMenu());
}

/**
 * Resolves a Scoop shim to the executable it actually points at.
 *
 * Scoop puts its shims (not the real binaries) on the PATH, so `findOnPath`
 * resolves HeidiSQL to `...\scoop\shims\heidisql.exe`. That shim carries a
 * sibling `<name>.shim` file — an INI-like file with a `path = "..."` line — that
 * records the real executable under `...\scoop\apps\heidisql\current\`. Following
 * it matters because `portable_settings.txt` lives next to the real exe, never
 * next to the shim, so portable-mode detection fails if we stop at the shim.
 *
 * Returns the shim target when the path is a shim, otherwise the path unchanged.
 */
async function resolveShimTarget(exePath: string): Promise<string> {
  const shimFile = path.join(path.dirname(exePath), path.basename(exePath, path.extname(exePath)) + ".shim");
  let content: string;
  try {
    content = await readFile(shimFile, "utf8");
  } catch {
    return exePath; // No sibling .shim file — not a Scoop shim.
  }
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*path\s*=\s*(.+?)\s*$/i);
    if (match) {
      const target = unquote(match[1]);
      if (target && (await fileExists(target))) return target;
    }
  }
  return exePath;
}

/**
 * Resolves the HeidiSQL executable to use.
 *
 * A path configured in preferences always wins on every platform. Otherwise
 * HeidiSQL is auto-detected:
 *
 * - Windows: PATH → Scoop → actual install location (registry / Start Menu),
 *   with any Scoop shim followed to the real executable so that portable-mode
 *   detection can find `portable_settings.txt` next to it.
 * - macOS: the `heidisql.app` bundle in `/Applications` or `~/Applications`.
 *
 * Returns `undefined` if nothing could be found.
 */
export async function resolveHeidiExe(configuredPath?: string): Promise<string | undefined> {
  const configured = configuredPath?.trim();
  if (configured) return configured;

  if (IS_MAC) return findMacApp();

  const found = (await findOnPath()) ?? (await findInScoop()) ?? (await findInstalledLocation());
  return found ? resolveShimTarget(found) : undefined;
}

const REGISTRY_ROOT = "HKCU:\\Software\\HeidiSQL\\Servers";

/** The same key as `REGISTRY_ROOT`, in the form PowerShell reports a key's `Name` in. */
const REGISTRY_ROOT_PREFIX = "HKEY_CURRENT_USER\\Software\\HeidiSQL\\Servers\\";

/** One session key, as the snippet below reports it. `NetType` is a REG_DWORD. */
interface RawRegistrySession {
  key?: string;
  netType?: number | string;
}

/**
 * Only keys are enumerated, never their values, so the QueryHistory and per-table
 * settings that make a full dump of this tree enormous are never even read. A key
 * owns a session when it has a `Host` value; `-contains` matches value names
 * exactly (and case-insensitively), so `SSHhost`-only keys are not mistaken for
 * sessions. Subkeys we may not open are skipped rather than failing the whole read.
 */
const READ_SESSIONS_SCRIPT = `
$key = ${psQuote(REGISTRY_ROOT)}
if (Test-Path -LiteralPath $key) {
  $result = @(Get-ChildItem -LiteralPath $key -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Property -contains 'Host' } |
    ForEach-Object {
      $values = Get-ItemProperty -LiteralPath $_.PSPath
      [pscustomobject]@{ key = $_.Name; netType = $values.NetType }
    })
}
`;

/**
 * Reads every HeidiSQL session from the current user's registry.
 *
 * Mirrors the original Flow Launcher plugin: it walks
 * `HKCU\\Software\\HeidiSQL\\Servers` recursively and treats any key that owns a
 * `Host` value as a session. The identifier is the key path relative to
 * `Servers\\`, preserving any folder structure.
 *
 * Throws if the registry cannot be read at all; a missing key simply means the
 * user has no saved sessions and yields an empty list.
 */
async function getRegistrySessions(): Promise<HeidiSession[]> {
  const rows = await queryRegistry<RawRegistrySession>(READ_SESSIONS_SCRIPT);

  const sessions: HeidiSession[] = [];
  for (const { key, netType } of rows) {
    if (!key || !key.startsWith(REGISTRY_ROOT_PREFIX)) continue;
    const identifier = key.slice(REGISTRY_ROOT_PREFIX.length);
    if (!identifier) continue;

    const parsedNetType = Number(netType);
    sessions.push({
      identifier,
      databaseType: databaseTypeFromNetType(Number.isInteger(parsedNetType) ? parsedNetType : undefined),
    });
  }
  return sessions;
}

// Captures a session setting from a portable_settings.txt line. HeidiSQL writes
// one value per line as `Servers\<session>\<ValueName><sep><type><sep><data>`,
// where <sep> is a tab in older files and the literal `<|||>` in newer ones.
//
// The session is matched with a single lazy quantifier anchored at the start, so
// matching remains linear even when QueryHistory lines are hundreds of KB.
const PORTABLE_SESSION_SETTING_REGEX =
  /^Servers\\(?<session>.*?)\\(?<setting>Host|NetType)(?:\t[^\t]*\t|<\|\|\|>[^<]*<\|\|\|>)(?<value>.*)$/i;

/** The file HeidiSQL writes its settings to when running in portable mode. */
const PORTABLE_SETTINGS_FILE = "portable_settings.txt";

/**
 * Reports whether HeidiSQL is running in portable mode, which it decides purely
 * by the presence of `portable_settings.txt` next to the executable. When that
 * file exists HeidiSQL reads and writes sessions there and ignores the registry
 * entirely (common for Scoop and other portable installs), so the registry can
 * be stale or empty even though the user has many saved sessions.
 */
async function hasPortableSettings(exePath: string): Promise<boolean> {
  return fileExists(path.join(path.dirname(exePath), PORTABLE_SETTINGS_FILE));
}

/**
 * Reads sessions from `portable_settings.txt` located next to the executable,
 * used when HeidiSQL runs in portable mode.
 */
async function getPortableSessions(exePath: string): Promise<HeidiSession[]> {
  const settingsPath = path.join(path.dirname(exePath), PORTABLE_SETTINGS_FILE);
  const content = await readFile(settingsPath, "utf8");

  const records = new Map<string, { hasHost: boolean; netType?: number }>();
  for (const line of content.split(/\r?\n/)) {
    const match = PORTABLE_SESSION_SETTING_REGEX.exec(line);
    const identifier = match?.groups?.session;
    const setting = match?.groups?.setting.toLowerCase();
    if (!identifier || !setting) continue;

    const record = records.get(identifier) ?? { hasHost: false };
    if (setting === "host") record.hasHost = true;
    if (setting === "nettype") {
      const parsed = Number(match.groups?.value.trim());
      if (Number.isInteger(parsed)) record.netType = parsed;
    }
    records.set(identifier, record);
  }

  return [...records.entries()]
    .filter(([, record]) => record.hasHost)
    .map(([identifier, record]) => ({
      identifier,
      databaseType: databaseTypeFromNetType(record.netType),
    }));
}

/**
 * Returns all HeidiSQL sessions from the appropriate source for the platform.
 *
 * - macOS: always the `settings.json` file under `~/.config/heidisql`. The
 *   native (Lazarus) build has no registry or portable mode, so `exePath` and
 *   `forcePortable` are ignored there.
 * - Windows: portable mode is used when the caller forces it, or — so the
 *   extension works out of the box for portable/Scoop installs — when a
 *   `portable_settings.txt` sits next to the executable. Otherwise sessions
 *   come from the registry.
 */
export async function getAllSessions(exePath: string, forcePortable: boolean): Promise<HeidiSession[]> {
  if (IS_MAC) return getMacSessions();

  const usePortable = forcePortable || (await hasPortableSettings(exePath));
  return usePortable ? getPortableSessions(exePath) : getRegistrySessions();
}

/**
 * Launches HeidiSQL. When a session is provided it is opened via the `-d`
 * (description) command-line argument; otherwise HeidiSQL opens with no session.
 * The process is detached so it keeps running after Raycast closes.
 *
 * On macOS `exePath` is usually the `heidisql.app` bundle, so it is resolved to
 * the actual executable inside it first. The binary is spawned directly (rather
 * than via `open`) so the `-d` argument reaches a HeidiSQL that is already
 * running, matching the Windows behavior, and the environment is patched (see
 * `macLaunchEnv`) so helper binaries like `ssh` are still on the `PATH`.
 *
 * The session identifier always uses a backslash between folder segments (that
 * is HeidiSQL's own delimiter on Windows, and what we build identifiers with).
 * The native macOS (Lazarus) build, however, stores settings in JSON and looks
 * a session up by splitting the `-d` value on a forward slash only — it never
 * converts backslashes. Passing `-d "Folder\Session"` there looks for a single
 * key literally named `Folder\Session`, which does not exist, so HeidiSQL opens
 * the session manager with nothing selected. Converting to forward slashes on
 * macOS makes folder sessions open directly, while top-level sessions (no
 * separator) are unaffected.
 */
export async function launchHeidi(exePath: string, session?: HeidiSession): Promise<void> {
  const target = IS_MAC ? await macExecutablePath(exePath) : exePath;
  const identifier = session && IS_MAC ? session.identifier.replace(/\\/g, "/") : session?.identifier;
  const args = identifier ? ["-d", identifier] : [];
  return new Promise((resolve, reject) => {
    const child = spawn(target, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
      env: IS_MAC ? macLaunchEnv() : process.env,
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// macOS
// ---------------------------------------------------------------------------
//
// The native macOS build (a Lazarus/LCL port) does not use the Windows registry
// or a portable_settings.txt. It ships as a `heidisql.app` bundle and keeps all
// of its settings — including saved sessions — in a JSON file at
// `~/.config/heidisql/settings.json`.

/** The macOS app-bundle name, matching what HeidiSQL ships (case-sensitive). */
const MAC_APP_NAME = "heidisql.app";

/** Where a `heidisql.app` bundle is looked for, in order of preference. */
const MAC_APP_LOCATIONS = [
  path.join("/Applications", MAC_APP_NAME),
  path.join(os.homedir(), "Applications", MAC_APP_NAME),
];

/** The macOS settings file HeidiSQL reads and writes its sessions to. */
const MAC_SETTINGS_FILE = path.join(os.homedir(), ".config", "heidisql", "settings.json");

// Standard directories a GUI app gets on its PATH when opened from Finder (the
// launchd default), plus the common Homebrew locations. HeidiSQL's SSH tunnels
// shell out to helper binaries — `ssh` lives at `/usr/bin/ssh` — so these must
// be reachable.
const MAC_PATH_DIRS = ["/usr/bin", "/bin", "/usr/sbin", "/sbin", "/usr/local/bin", "/opt/homebrew/bin"];

/**
 * Builds the environment HeidiSQL is spawned with on macOS.
 *
 * Spawning the executable directly makes it inherit Raycast's environment, whose
 * `PATH` does not include `/usr/bin`. HeidiSQL would then fail to find `ssh` when
 * opening an SSH-tunnelled session (`exec: "ssh": executable file not found in
 * $PATH`), even though it works when the app is opened from Finder. Appending the
 * standard directories restores that behavior without dropping anything already
 * on the inherited `PATH`.
 */
function macLaunchEnv(): NodeJS.ProcessEnv {
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const dir of MAC_PATH_DIRS) {
    if (!dirs.includes(dir)) dirs.push(dir);
  }
  return { ...process.env, PATH: dirs.join(path.delimiter) };
}

/** Finds the `heidisql.app` bundle in the standard install locations. */
async function findMacApp(): Promise<string | undefined> {
  for (const candidate of MAC_APP_LOCATIONS) {
    if (await fileExists(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Resolves a `.app` bundle to the executable inside it (`Contents/MacOS/<exe>`).
 *
 * The executable is normally named after the bundle (`heidisql.app` ->
 * `heidisql`); if that guess is missing (e.g. a renamed bundle) it falls back to
 * the first entry in `Contents/MacOS`. A path that is not a bundle — someone
 * pointed the preference straight at the binary — is returned unchanged.
 */
async function macExecutablePath(appOrBinary: string): Promise<string> {
  if (!appOrBinary.endsWith(".app")) return appOrBinary;

  const macOSDir = path.join(appOrBinary, "Contents", "MacOS");
  const guess = path.join(macOSDir, path.basename(appOrBinary, ".app"));
  if (await fileExists(guess)) return guess;

  try {
    const [first] = await readdir(macOSDir);
    if (first) return path.join(macOSDir, first);
  } catch {
    // Not a well-formed bundle — fall through to the best guess.
  }
  return guess;
}

/**
 * Reads all HeidiSQL sessions from `~/.config/heidisql/settings.json`.
 *
 * A missing or unreadable file means "no sessions" (HeidiSQL never ran, or has
 * none saved) rather than an error.
 */
async function getMacSessions(): Promise<HeidiSession[]> {
  let content: string;
  try {
    content = await readFile(MAC_SETTINGS_FILE, "utf8");
  } catch {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Could not parse ${MAC_SETTINGS_FILE}: the file is not valid JSON.`);
  }

  const servers = isRecord(parsed) ? parsed.Servers : undefined;
  if (!isRecord(servers)) return [];

  const sessions: HeidiSession[] = [];
  collectMacSessions(servers, "", sessions);
  return sessions;
}

/**
 * Walks the `Servers` tree collecting sessions, preserving folder structure.
 *
 * This mirrors the Windows registry walk: any object that owns a `Host` value is
 * a session (and is not descended into, so its own nested objects such as
 * `QueryHistory` are ignored); any other object is a folder and is recursed
 * into. Folder segments are joined with a backslash to match HeidiSQL's own
 * session-tree delimiter and the identifiers produced on Windows.
 */
function collectMacSessions(node: Record<string, unknown>, prefix: string, out: HeidiSession[]): void {
  for (const [key, value] of Object.entries(node)) {
    if (!isRecord(value)) continue;
    const identifier = prefix ? `${prefix}\\${key}` : key;
    if (typeof value.Host === "string") {
      const parsedNetType = Number(value.NetType);
      out.push({
        identifier,
        databaseType: databaseTypeFromNetType(Number.isInteger(parsedNetType) ? parsedNetType : undefined),
      });
    } else {
      collectMacSessions(value, identifier, out);
    }
  }
}

/** Type guard for a plain (non-null, non-array) JSON object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
