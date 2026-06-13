/**
 * Path resolution, command building, and "launch into an interactive session".
 *
 * Concept (see docs/raycast-claude-code/07):
 *  - The launcher's job is to take you there. The primary action launches; copy is the fallback.
 *  - We launch interactive claude (the flat-rate path). We never use -p (avoids metered billing).
 *  - OS differences are confined to "how the terminal is opened": mac=Terminal, Windows=wt+wsl
 *    for WSL sessions and wt+PowerShell for Windows-native sessions (see Backend).
 */
import { execFile } from "child_process";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { getPreferenceValues } from "@raycast/api";

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";

// Preference types are auto-generated from package.json into raycast-env.d.ts
// (the global `Preferences` type), so a hand-written interface can't drift out of sync.
export function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

/**
 * Where a session lives and how it must be launched.
 *  - "native": the .claude under the OS home — launched in the OS-native terminal
 *    (macOS Terminal, or Windows PowerShell). cwd is an OS-native path.
 *  - "wsl": a .claude inside a WSL distro (Windows only) — launched via wt + wsl.
 *    cwd is a Linux path.
 */
export type Backend = "native" | "wsl";

export interface Store {
  backend: Backend;
  root: string; // absolute path to a .claude directory
}

/** Human label for a backend. "native" reads as the host OS (macOS vs Windows/native). */
export function backendLabel(b: Backend): string {
  if (b === "wsl") return "WSL";
  return isMac ? "macOS" : "Windows/native";
}

let cachedClaudeHome: string | undefined;

/**
 * Resolve the path to `.claude`.
 *  - mac/Linux: ~/.claude
 *  - Windows: a UNC path into WSL. We must NOT assume the WSL Linux username equals
 *    the Windows username (os.userInfo() here is the Windows user, which often differs),
 *    so we ask WSL for the real $HOME and build the UNC path from it.
 * Async because the Windows branch shells out to WSL; the result is cached.
 */
export async function claudeHome(): Promise<string> {
  const p = prefs().claudeHome?.trim();
  if (p) return p;
  if (isWindows) {
    if (cachedClaudeHome) return cachedClaudeHome;
    const distro = prefs().wslDistro?.trim() || "Ubuntu";
    const home = await wslHome(distro); // e.g. /home/foo
    cachedClaudeHome = wslToUncPath(distro, `${home}/.claude`);
    return cachedClaudeHome;
  }
  return path.join(os.homedir(), ".claude");
}

/**
 * Every .claude store to read sessions from.
 *  - mac/Linux: the single native ~/.claude.
 *  - Windows: the Windows-native store (C:\Users\<you>\.claude, via os.homedir) AND the
 *    WSL store, whichever actually has a projects/ folder — so claude used from either
 *    PowerShell/cmd or WSL shows up. None of these paths are hardcoded to a user.
 * An explicit `claudeHome` preference overrides everything with a single store.
 */
export async function claudeStores(): Promise<Store[]> {
  const override = prefs().claudeHome?.trim();
  if (override) {
    // On Windows a UNC path means WSL; anything else (incl. mac/Linux) is native.
    const backend: Backend =
      isWindows && /^\\\\/.test(override) ? "wsl" : "native";
    return [{ backend, root: override }];
  }
  if (!isWindows) {
    return [{ backend: "native", root: path.join(os.homedir(), ".claude") }];
  }
  const stores: Store[] = [];
  const nativeRoot = path.join(os.homedir(), ".claude");
  if (await hasProjects(nativeRoot))
    stores.push({ backend: "native", root: nativeRoot });
  try {
    const wslRoot = await claudeHome();
    if (await hasProjects(wslRoot))
      stores.push({ backend: "wsl", root: wslRoot });
  } catch {
    // ignore — WSL may be absent
  }
  // Never return empty: fall back to the resolved WSL home so the UI has something.
  if (stores.length === 0)
    stores.push({ backend: "wsl", root: await claudeHome() });
  return stores;
}

async function hasProjects(root: string): Promise<boolean> {
  return (await readDirSafe(path.join(root, "projects"))).length > 0;
}

/** The store the global (non-session) views read: the projects dir and the Setup defaults. */
async function primaryRoot(): Promise<string> {
  return (await claudeStores())[0].root;
}

export const projectsDir = async () =>
  path.join(await primaryRoot(), "projects");

export const claudeBin = () => prefs().claudeBin?.trim() || "claude";

export function shArg(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/** PowerShell single-quoted literal: embedded single quotes are doubled. */
export function psArg(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/**
 * AppleScript double-quoted string literal: backslash and double-quote are escaped.
 * Used when interpolating a path/command into an osascript `-e` program (e.g. Ghostty's
 * `command of cfg to "<...>"`). Backslash first, so the quote-escape's backslash isn't
 * doubled.
 */
export function asStr(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * For the copy fallback: a command the user can paste into the right shell.
 *  - native on Windows → PowerShell: `Set-Location -LiteralPath '<cwd>'; & claude <extra...>`
 *  - otherwise (wsl / mac / Linux) → POSIX: `cd '<cwd>' && claude <extra...>`
 */
export function buildCommand(
  extra: string[],
  cwd?: string,
  backend: Backend = "native",
): string {
  const bin = claudeBin();
  if (isWindows && backend === "native") {
    const body = `& ${psArg(bin)}${extra.length ? " " + extra.map(psArg).join(" ") : ""}`;
    return cwd ? `Set-Location -LiteralPath ${psArg(cwd)}; ${body}` : body;
  }
  const body = `${shArg(bin)}${extra.length ? " " + extra.map(shArg).join(" ") : ""}`;
  return cwd ? `cd ${shArg(cwd)} && ${body}` : body;
}

export async function readDirSafe(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

function run(file: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: false }, (err) =>
      err ? reject(err) : resolve(),
    );
  });
}

const TEMP_SCRIPT_PREFIX = "raycast-claude-";
const TEMP_SCRIPT_TTL_MS = 60_000;

/**
 * Remove leftover launch scripts from previous runs.
 *
 * Each launch writes a temp `.sh`/`.ps1` that the terminal sources *after* we return, so we
 * can't delete the one we just wrote (we'd race the read). Instead we sweep on every launch:
 * any script older than the grace period has certainly been sourced already. This keeps the
 * OS temp dir from accumulating raycast-claude-* files over time. Best-effort and silent.
 */
async function sweepOldTempScripts(): Promise<void> {
  const dir = os.tmpdir();
  const now = Date.now();
  for (const name of await readDirSafe(dir)) {
    if (!name.startsWith(TEMP_SCRIPT_PREFIX)) continue;
    if (!name.endsWith(".sh") && !name.endsWith(".ps1")) continue;
    const file = path.join(dir, name);
    try {
      const stat = await fs.stat(file);
      if (now - stat.mtimeMs > TEMP_SCRIPT_TTL_MS) await fs.unlink(file);
    } catch {
      // ignore — already gone, or locked by a still-starting terminal
    }
  }
}

/**
 * Actually launch an interactive claude session (the primary action).
 * Throws on failure, so the caller can fall back to copying.
 * @param cwd     launch directory (the cwd recorded in the session JSONL)
 * @param extra   args for claude (e.g. ["-r", "<id>"] / ["--continue"])
 * @param backend which environment the session belongs to (decides the terminal/shell)
 */
export async function launchInteractive(
  cwd: string | undefined,
  extra: string[] = [],
  backend: Backend = "native",
): Promise<void> {
  await sweepOldTempScripts();
  if (isWindows && backend === "wsl") return launchWsl(cwd, extra);
  if (isWindows) return launchWindowsNative(cwd, extra);
  return launchMac(cwd, extra);
}

/** Windows + WSL: open the WSL login shell in a Windows Terminal tab. */
async function launchWsl(
  cwd: string | undefined,
  extra: string[],
): Promise<void> {
  const distro = prefs().wslDistro?.trim() || "Ubuntu";
  // Open in the user's login shell (zsh/bash/fish/etc). Tools like node/npx are
  // enabled via mise in that shell's rc (.zshrc etc), so hardcoding bash would
  // leave MCP's npx and friends missing. Using the login shell reproduces "the
  // same environment as the user's everyday terminal".
  const shell = await wslLoginShell(distro);
  const inner = `${shArg(claudeBin())}${extra.length ? " " + extra.map(shArg).join(" ") : ""}`;
  // cd to cwd → launch claude → exec the user's shell so the window stays open.
  const body = `${cwd ? `cd ${shArg(cwd)} && ` : ""}${inner}\nexec ${shArg(shell)}\n`;
  const winTmp = path.join(
    os.tmpdir(),
    `${TEMP_SCRIPT_PREFIX}${Date.now()}.sh`,
  );
  await fs.writeFile(winTmp, body, { encoding: "utf8" });
  const wslPath = winToWslPath(winTmp);
  // <shell> -lic = login + interactive init → .zprofile/.zshrc etc are read and
  // mise (node/npx) is loaded. We only pass `source <path>`, so there's no ; and
  // wt doesn't spawn extra tabs.
  const sourceCmd = `source ${shArg(wslPath)}`;
  try {
    await run("wt.exe", [
      "-w",
      "0",
      "wsl.exe",
      "-d",
      distro,
      "--",
      shell,
      "-lic",
      sourceCmd,
    ]);
  } catch {
    await run("wsl.exe", ["-d", distro, "--", shell, "-lic", sourceCmd]);
  }
}

// PowerShell that rebuilds PATH *and* PATHEXT from the persisted machine+user environment.
// A shell spawned by a GUI app (Raycast) inherits a broken env: PATH can be missing mise
// and ~/.local/bin (where claude.exe lives), and — crucially — PATHEXT comes through as just
// ".CPL", so bare `claude`/`mise` don't resolve to their .exe (only `claude.exe` would).
// Recreating both reproduces what a fresh terminal sees.
const PS_REFRESH_ENV = [
  `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`,
  `$pe = [Environment]::GetEnvironmentVariable('PATHEXT','Machine'); if ($pe) { $env:PATHEXT = $pe }`,
].join("; ");

/**
 * Windows-native: open PowerShell in a Windows Terminal tab and run claude there.
 *
 * We launch with `-NoProfile` and load the profile ourselves *after* fixing PATH —
 * otherwise the auto-loaded profile runs first with the stale PATH and its `mise activate`
 * (and anything else) fails. Order: refresh PATH → dot-source the user's profile (so mise /
 * node / npx for MCP match the everyday terminal) → cd → claude. This is the PowerShell
 * analogue of the WSL `-lic` login shell.
 *
 * We run a temp .ps1 via `-File` (so no `;` reaches wt, which would split it into extra
 * tabs), with `-NoExit` to keep the window open and `-ExecutionPolicy Bypass` for the temp
 * script and the (possibly unsigned) profile.
 */
async function launchWindowsNative(
  cwd: string | undefined,
  extra: string[],
): Promise<void> {
  const lines = [
    PS_REFRESH_ENV,
    `foreach ($p in $PROFILE.AllUsersAllHosts,$PROFILE.AllUsersCurrentHost,$PROFILE.CurrentUserAllHosts,$PROFILE.CurrentUserCurrentHost) { if ($p -and (Test-Path $p)) { . $p } }`,
    cwd ? `Set-Location -LiteralPath ${psArg(cwd)}` : "",
    `& ${psArg(claudeBin())}${extra.length ? " " + extra.map(psArg).join(" ") : ""}`,
  ].filter(Boolean);
  const tmp = path.join(os.tmpdir(), `${TEMP_SCRIPT_PREFIX}${Date.now()}.ps1`);
  await fs.writeFile(tmp, lines.join("\r\n") + "\r\n", { encoding: "utf8" });
  const shell = winShell();
  const shellArgs = [
    "-NoExit",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    tmp,
  ];
  try {
    await run("wt.exe", ["-w", "0", shell, ...shellArgs]);
  } catch {
    await run(shell, shellArgs);
  }
}

/** The macOS terminal app to launch sessions in (Terminal.app by default). */
type MacTerminal = "terminal" | "iterm" | "ghostty";
function macTerminal(): MacTerminal {
  const t = prefs().macTerminal?.trim();
  return t === "iterm" || t === "ghostty" ? t : "terminal";
}

/**
 * macOS: write a temp script that reproduces the session (cd → claude → exec the login
 * shell so the window stays open), then open it in the user's chosen terminal app.
 * All three terminals start a login interactive shell, so mise and the rest are set up.
 */
async function launchMac(
  cwd: string | undefined,
  extra: string[],
): Promise<void> {
  const inner = `${shArg(claudeBin())}${extra.length ? " " + extra.map(shArg).join(" ") : ""}`;
  const shell = process.env.SHELL || "/bin/zsh";
  const body = `${cwd ? `cd ${shArg(cwd)} && ` : ""}${inner}\nexec ${shArg(shell)}\n`;
  const tmp = path.join(os.tmpdir(), `${TEMP_SCRIPT_PREFIX}${Date.now()}.sh`);
  await fs.writeFile(tmp, body, { mode: 0o755 });
  switch (macTerminal()) {
    case "iterm":
      return launchMacIterm(tmp);
    case "ghostty":
      return launchMacGhostty(tmp, shell);
    default:
      return launchMacTerminal(tmp);
  }
}

/** Terminal.app: run the script before activating to avoid an extra startup window. */
async function launchMacTerminal(tmp: string): Promise<void> {
  await run("osascript", [
    "-e",
    `tell application "Terminal" to do script "source ${tmp}"`,
    "-e",
    'tell application "Terminal" to activate',
  ]);
}

/**
 * iTerm2: reuse its startup window when launching the app, otherwise create a new one.
 * Activating iTerm before creating a window can produce an extra empty startup window.
 */
async function launchMacIterm(tmp: string): Promise<void> {
  const script = [
    'set wasRunning to application "iTerm" is running',
    'tell application "iTerm"',
    "  if wasRunning then",
    "    set w to (create window with default profile)",
    "  else",
    "    launch",
    "    repeat 40 times",
    "      if (count of windows) > 0 then exit repeat",
    "      delay 0.05",
    "    end repeat",
    "    if (count of windows) > 0 then",
    "      set w to current window",
    "    else",
    "      set w to (create window with default profile)",
    "    end if",
    "  end if",
    "  tell current session of w",
    `    write text "source ${tmp}"`,
    "  end tell",
    "  activate",
    "end tell",
  ].join("\n");
  await run("osascript", ["-e", script]);
}

/**
 * Ghostty: open a new window in the *running* instance via AppleScript (Ghostty 1.3+ ships
 * a scripting dictionary), so it never spawns a second app process. The old `open -na`
 * path forced a fresh instance with `-n` every launch, and each instance is its own dock
 * icon — open ten sessions and ten Ghostty icons pile up in the dock (they only self-clean
 * once each window closes, via the `quit-after-last-window-closed` that `-e` auto-enables).
 *
 * Instead we build a `surface configuration` whose `command` is the login shell sourcing
 * our temp script, then `new window with configuration` — Ghostty reuses the existing
 * process, so the dock keeps a single icon. We mirror launchMacIterm/launchMacTerminal,
 * which already drive their terminals through osascript.
 *
 * The scripting dictionary is a preview API (Ghostty 1.3.x) and needs the one-time macOS
 * Automation (Apple Events) consent the first time Raycast controls Ghostty. If the script
 * fails — older Ghostty without the dictionary, or consent declined — we fall back to the
 * old `open -na ... -e` path so launching still works (at the cost of an extra dock icon).
 */
async function launchMacGhostty(tmp: string, shell: string): Promise<void> {
  // `command` is a single shell invocation: the login shell sourcing our temp script
  // (cd → claude → exec shell). -lic isn't needed — the script's `exec <login shell>`
  // already lands the user in their normal interactive shell once claude exits.
  const command = `${shArg(shell)} -lc ${shArg(`source ${tmp}`)}`;
  const script = [
    'tell application "Ghostty"',
    "  set cfg to new surface configuration",
    `  set command of cfg to ${asStr(command)}`,
    "  new window with configuration cfg",
    "  activate",
    "end tell",
  ].join("\n");
  try {
    await run("osascript", ["-e", script]);
  } catch {
    // Pre-1.3 Ghostty (no dictionary) or Automation consent declined: fall back to the
    // legacy new-instance launch. -e takes an argv (run directly, no /bin/sh wrap since
    // Ghostty 1.2), so pass the login shell and its -c body as separate arguments.
    await run("open", [
      "-na",
      "Ghostty",
      "--args",
      "-e",
      shell,
      "-c",
      `source ${tmp}`,
    ]);
  }
}

/** The Windows PowerShell executable to launch (pwsh 7 by default, or Windows PowerShell 5). */
function winShell(): string {
  return prefs().winShell?.trim() === "powershell"
    ? "powershell.exe"
    : "pwsh.exe";
}

/** C:\\Users\\..\\Temp\\x.sh → /mnt/c/Users/../Temp/x.sh (for access from WSL) */
function winToWslPath(p: string): string {
  const m = /^([A-Za-z]):[\\/](.*)$/.exec(p);
  if (!m) return p.replace(/\\/g, "/");
  return `/mnt/${m[1].toLowerCase()}/${m[2].replace(/\\/g, "/")}`;
}

function runCapture(file: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { windowsHide: true, encoding: "utf8" },
      (err, stdout) => (err ? reject(err) : resolve(stdout)),
    );
  });
}

/** Ask WSL for the user's $HOME (e.g. /home/foo). Falls back to /home/<windows-user>. */
async function wslHome(distro: string): Promise<string> {
  try {
    const out = await runCapture("wsl.exe", [
      "-d",
      distro,
      "--",
      "sh",
      "-c",
      "echo $HOME",
    ]);
    const home = out.trim().split("\n").pop()?.trim();
    if (home && home.startsWith("/")) return home;
  } catch {
    // ignore → fall back below
  }
  // Best-effort only, and often wrong: os.userInfo() here is the Windows user, which
  // need not match the WSL Linux user (the very assumption we query $HOME to avoid).
  // We reach this only when the WSL query itself failed, in which case little works anyway.
  return `/home/${os.userInfo().username}`;
}

/** /home/foo/.claude → \\wsl.localhost\Ubuntu\home\foo\.claude */
function wslToUncPath(distro: string, p: string): string {
  const rel = p.replace(/^\/+/, "").replace(/\//g, "\\");
  return `\\\\wsl.localhost\\${distro}\\${rel}`;
}

/** Get the WSL user's login shell (the shell field in /etc/passwd). Falls back to bash. */
async function wslLoginShell(distro: string): Promise<string> {
  try {
    const out = await runCapture("wsl.exe", [
      "-d",
      distro,
      "--",
      "sh",
      "-c",
      "getent passwd $(id -u) | cut -d: -f7",
    ]);
    const sh = out.trim().split("\n").pop()?.trim();
    if (sh && sh.startsWith("/")) return sh;
  } catch {
    // ignore → fall back to bash
  }
  return "bash";
}
