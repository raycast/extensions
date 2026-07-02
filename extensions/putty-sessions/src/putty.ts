import { execFile, spawn } from "child_process";
import { constants } from "fs";
import { access } from "fs/promises";
import { readdir } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const EXE_NAME = "putty.exe";

/**
 * A single saved PuTTY session, as stored under
 * `HKCU\Software\SimonTatham\PuTTY\Sessions`.
 */
export interface PuttySession {
  /**
   * The session name as PuTTY knows it (already URL-decoded). This exact value
   * is passed to `putty.exe -load "<identifier>"`.
   */
  identifier: string;
  /** Connection protocol, e.g. `ssh`, `telnet`, `serial`. May be empty. */
  protocol: string;
  /** Optional username configured for the session. */
  username: string;
  /** Hostname (or, for serial sessions, `<line>?baud=<speed>`). */
  hostname: string;
}

/**
 * Returns the `protocol://[user@]host` label PuTTY's own plugin used as a
 * session subtitle. Mirrors `PuttySession.ToString()` from the original.
 */
export function sessionSubtitle(session: PuttySession): string {
  if (!session.protocol && !session.hostname) return "";
  const proto = session.protocol || "ssh";
  if (!session.hostname) return proto;
  return session.username ? `${proto}://${session.username}@${session.hostname}` : `${proto}://${session.hostname}`;
}

async function fileExists(candidate: string): Promise<boolean> {
  try {
    await access(candidate, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Looks for `putty.exe` in each directory on the PATH environment variable. */
async function findOnPath(): Promise<string | undefined> {
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    const candidate = path.join(dir, EXE_NAME);
    if (await fileExists(candidate)) return candidate;
  }
  return undefined;
}

/** Looks for a Scoop-installed PuTTY, in both user and global Scoop roots. */
async function findInScoop(): Promise<string | undefined> {
  const roots = [
    process.env.SCOOP,
    path.join(os.homedir(), "scoop"),
    process.env.SCOOP_GLOBAL,
    path.join(process.env.ProgramData ?? "C:\\ProgramData", "scoop"),
  ].filter((root): root is string => Boolean(root));

  for (const root of roots) {
    const candidate = path.join(root, "apps", "putty", "current", EXE_NAME);
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

/** Reads a single string value from a registry key, or `undefined` if absent. */
async function readRegistryValue(key: string, name: string): Promise<string | undefined> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("reg", ["query", key, "/v", name], { windowsHide: true }));
  } catch {
    return undefined;
  }
  for (const raw of stdout.split(/\r?\n/)) {
    // "<name>    REG_SZ    <data>" — data may contain single spaces.
    const match = raw.trim().match(/^(.+?)\s+REG_\w+\s+(.*)$/);
    if (match && match[1].trim().toLowerCase() === name.toLowerCase()) {
      return match[2].trim() || undefined;
    }
  }
  return undefined;
}

// Some installers (and manual setups) register the canonical path to putty.exe
// under the "App Paths" key. The official MSI does NOT, but Chocolatey and older
// Inno-style installers do, so it's a cheap, authoritative first check.
const APP_PATHS_KEYS = [
  "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\putty.exe",
  "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\putty.exe",
  "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\putty.exe",
];

// The registry key the Windows Installer uses to record every folder an MSI
// created. PuTTY's official MSI leaves its Uninstall entry's DisplayIcon /
// InstallLocation empty, so this is the only place the install directory
// (e.g. `C:\Program Files\PuTTY\`) is actually recorded. Value NAMES are the
// folder paths; the data is empty. Present in the 64-bit and 32-bit views.
const INSTALLER_FOLDERS_KEYS = [
  "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Installer\\Folders",
  "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Installer\\Folders",
];

// Inno-style installers (older PuTTY builds) record uninstall info including the
// install location under a `PuTTY_is1` suffix. The MSI uses an opaque GUID we
// can't hardcode, which is why INSTALLER_FOLDERS_KEYS above covers that case.
const UNINSTALL_KEYS = [
  "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\PuTTY_is1",
  "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\PuTTY_is1",
  "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\PuTTY_is1",
];

/**
 * Finds putty.exe by scanning the MSI's recorded folders. Each value name under
 * the `Installer\Folders` key is a folder path; we take the ones whose leaf is
 * `PuTTY` and check for putty.exe inside.
 */
async function findInInstallerFolders(): Promise<string | undefined> {
  for (const key of INSTALLER_FOLDERS_KEYS) {
    let stdout: string;
    try {
      ({ stdout } = await execFileAsync("reg", ["query", key], { windowsHide: true, maxBuffer: 16 * 1024 * 1024 }));
    } catch {
      continue;
    }
    for (const raw of stdout.split(/\r?\n/)) {
      // "    <folder path>    REG_SZ" — the folder path (value name) may contain
      // spaces, so split on the 2+ space gap before the REG_ type.
      const match = raw.match(/^\s+(.+?)\s{2,}REG_\w+/);
      if (!match) continue;
      const folder = match[1].trim().replace(/[\\/]+$/, "");
      if (path.win32.basename(folder).toLowerCase() !== "putty") continue;
      const exe = path.join(folder, EXE_NAME);
      if (await fileExists(exe)) return exe;
    }
  }
  return undefined;
}

/** Finds PuTTY via the Windows registry (App Paths, MSI folders, then uninstall info). */
async function findInRegistry(): Promise<string | undefined> {
  // App Paths: the default value of the key is the full path to putty.exe.
  for (const key of APP_PATHS_KEYS) {
    const value = await readRegistryValue(key, "(Default)");
    if (value) {
      const exe = unquote(value);
      if (exe.toLowerCase().endsWith(EXE_NAME) && (await fileExists(exe))) return exe;
    }
    // App Paths also exposes a "Path" value pointing at the install directory.
    const dir = await readRegistryValue(key, "Path");
    if (dir) {
      const exe = path.join(unquote(dir), EXE_NAME);
      if (await fileExists(exe)) return exe;
    }
  }

  // The official MSI records its install directory only here.
  const fromMsi = await findInInstallerFolders();
  if (fromMsi) return fromMsi;

  for (const key of UNINSTALL_KEYS) {
    const displayIcon = await readRegistryValue(key, "DisplayIcon");
    if (displayIcon) {
      const exe = stripIconIndex(unquote(displayIcon));
      if (exe.toLowerCase().endsWith(EXE_NAME) && (await fileExists(exe))) return exe;
    }
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

/** Recursively collects `.lnk` files whose name matches PuTTY, up to a small depth. */
async function findPuttyShortcuts(dir: string, depth: number): Promise<string[]> {
  if (depth < 0) return [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await findPuttyShortcuts(full, depth - 1)));
    } else if (entry.isFile() && entry.name.toLowerCase() === "putty.lnk") {
      found.push(full);
    }
  }
  return found;
}

/**
 * Finds PuTTY via its Start Menu shortcut. The Start Menu folder is named
 * differently across versions ("PuTTY", "PuTTY (64-bit)", ...), so both the
 * all-users and per-user Programs trees are scanned for a `PuTTY.lnk`.
 */
async function findInStartMenu(): Promise<string | undefined> {
  const roots = [
    process.env.ProgramData && path.join(process.env.ProgramData, "Microsoft", "Windows", "Start Menu", "Programs"),
    process.env.APPDATA && path.join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs"),
  ].filter((root): root is string => Boolean(root));

  for (const root of roots) {
    for (const lnk of await findPuttyShortcuts(root, 3)) {
      const target = await resolveShortcut(lnk);
      if (target && target.toLowerCase().endsWith(EXE_NAME) && (await fileExists(target))) return target;
    }
  }
  return undefined;
}

/**
 * Resolves the PuTTY executable to use.
 *
 * A path configured in preferences always wins. Otherwise PuTTY is auto-detected
 * in order (top to bottom, per the port's spec): PATH → Scoop → Windows registry
 * (App Paths / uninstall entry) → Start Menu shortcut. Returns `undefined` if
 * nothing could be found.
 */
export async function resolvePuttyExe(configuredPath?: string): Promise<string | undefined> {
  const configured = configuredPath?.trim();
  if (configured) return configured;

  return (await findOnPath()) ?? (await findInScoop()) ?? (await findInRegistry()) ?? (await findInStartMenu());
}

const SESSIONS_ROOT = "HKEY_CURRENT_USER\\Software\\SimonTatham\\PuTTY\\Sessions";

/** Decodes a registry session key name, which PuTTY percent-encodes. */
function decodeSessionName(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

/** Parses a `REG_DWORD` hex value (e.g. `0x2580`) into a decimal number string. */
function parseDword(value: string | undefined): string {
  if (!value) return "";
  const match = value.trim().match(/0x([0-9a-fA-F]+)/);
  if (match) return String(parseInt(match[1], 16));
  return value.trim();
}

interface RawValues {
  [name: string]: string;
}

/**
 * Reads every saved PuTTY session from the current user's registry.
 *
 * Mirrors the original Flow Launcher plugin: it enumerates the subkeys of
 * `HKCU\Software\SimonTatham\PuTTY\Sessions`, decoding each subkey name into the
 * session identifier and reading Protocol/HostName/UserName for the subtitle.
 * Serial sessions get a `<line>?baud=<speed>` host, matching the original.
 */
export async function getSessions(): Promise<PuttySession[]> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("reg", ["query", SESSIONS_ROOT, "/s"], {
      windowsHide: true,
      maxBuffer: 32 * 1024 * 1024,
    }));
  } catch {
    // A non-zero exit means the key doesn't exist (PuTTY never ran, or has no
    // saved sessions). Treat that as "no sessions" rather than an error.
    return [];
  }

  const sessions: PuttySession[] = [];
  let currentEncodedName: string | null = null;
  let values: RawValues = {};

  const flush = () => {
    if (currentEncodedName === null) return;
    const identifier = decodeSessionName(currentEncodedName);
    if (!identifier) return;

    const protocol = (values["Protocol"] ?? "").toLowerCase();
    let hostname = values["HostName"] ?? "";
    let username = values["UserName"] ?? "";

    if (protocol === "serial") {
      const line = values["SerialLine"] ?? "";
      const speed = parseDword(values["SerialSpeed"]);
      hostname = speed ? `${line}?baud=${speed}` : line;
      username = "";
    }

    sessions.push({ identifier, protocol, username, hostname });
  };

  for (const raw of stdout.split(/\r?\n/)) {
    if (raw.startsWith("HKEY_CURRENT_USER")) {
      // New key block begins — commit the previous one first.
      flush();
      const key = raw.trim();
      if (key.length > SESSIONS_ROOT.length && key.toLowerCase().startsWith(SESSIONS_ROOT.toLowerCase() + "\\")) {
        // A direct child of Sessions is a session; deeper keys (PuTTY has none)
        // would still resolve to their immediate name here.
        currentEncodedName = key.slice(SESSIONS_ROOT.length + 1);
      } else {
        // The Sessions root key itself — not a session.
        currentEncodedName = null;
      }
      values = {};
    } else if (raw.trim().length > 0 && currentEncodedName !== null) {
      // Value line: "<name>    <type>    <data>".
      const match = raw.trim().match(/^(.+?)\s+REG_\w+\s+(.*)$/);
      if (match) values[match[1].trim()] = match[2].trim();
    }
  }
  flush();

  sessions.sort((a, b) => a.identifier.localeCompare(b.identifier, undefined, { sensitivity: "base" }));
  return sessions;
}

/** Escapes a single argument for a PowerShell single-quoted string. */
function psQuote(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'";
}

/**
 * Launches PuTTY, detached so it keeps running after Raycast closes.
 *
 * - A saved session is opened with `-load "<identifier>"`.
 * - A direct connection is opened with `-ssh <hostname>` (mirrors the original
 *   plugin's "start a session from your query" behavior).
 *
 * When `maximized` is set the process is started via `Start-Process
 * -WindowStyle Maximized` so PuTTY opens maximized, matching the original
 * plugin's "always start maximized" option.
 */
export async function launchPutty(
  exePath: string,
  target: { session?: PuttySession; directHost?: string },
  maximized = false,
): Promise<void> {
  const args = target.session
    ? ["-load", target.session.identifier]
    : target.directHost
      ? ["-ssh", target.directHost]
      : [];

  if (maximized) {
    // Start-Process honors -WindowStyle Maximized (SW_SHOWMAXIMIZED), which
    // PuTTY respects for its initial window state.
    const argList = args.length ? ` -ArgumentList ${args.map(psQuote).join(",")}` : "";
    const command = `Start-Process -FilePath ${psQuote(exePath)}${argList} -WindowStyle Maximized`;
    await new Promise<void>((resolve, reject) => {
      const child = spawn("powershell", ["-NoProfile", "-NonInteractive", "-Command", command], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      child.once("error", reject);
      child.once("spawn", () => {
        child.unref();
        resolve();
      });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(exePath, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
