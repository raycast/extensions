import type { Application } from "@raycast/api";
import { execFile, spawn } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { win32 } from "path";
import { promisify } from "util";

// Windows paths are built with the win32 flavour explicitly so the pure helpers behave the same
// under the test runner on macOS.
const { join } = win32;
const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Windows: open a folder in a terminal
// ---------------------------------------------------------------------------

const SYSTEM_ROOT = process.env.SystemRoot || process.env.windir || "C:\\Windows";
const SYSTEM32 = join(SYSTEM_ROOT, "System32");
const COMSPEC = process.env.ComSpec || join(SYSTEM32, "cmd.exe");
export const WINDOWS_POWERSHELL = join(SYSTEM32, "WindowsPowerShell", "v1.0", "powershell.exe");

/**
 * Windows Terminal ships as an MSIX package (Store and winget alike), so its executable lives in
 * a per-version folder under `Program Files\WindowsApps` and cannot be run from there without
 * package activation. The stable entry point is the app execution alias in the user's
 * `WindowsApps` folder. The alias at the top level is shared: stable and preview both register
 * `wt.exe`, and only one of them owns it at a time. Each package also gets its own copy in a
 * subfolder named after the package family, which is the one to use when a specific build was
 * chosen in the app picker.
 */
export function windowsTerminalAlias(
  packageFamily?: string,
  localAppData = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"),
) {
  return join(localAppData, "Microsoft", "WindowsApps", ...(packageFamily ? [packageFamily] : []), "wt.exe");
}

/**
 * The package family name out of a Windows app id such as
 * `Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe!App`: the identity before the `!`, made of a
 * name and a 13-character publisher hash. Anything else is not a packaged app.
 */
export function packageFamily(windowsAppId?: string): string | undefined {
  const family = windowsAppId?.split("!")[0];
  return family && /^[\w.-]+_[a-z0-9]{13}$/i.test(family) ? family : undefined;
}

/**
 * Where to look for the Windows Terminal that `app` stands for, most specific first: the alias
 * belonging to its package, then the path the picker supplied (skipped when it points into the
 * package store, which cannot be launched directly), then the shared alias.
 */
export function windowsTerminalCandidates(app?: Pick<Application, "path" | "windowsAppId">): string[] {
  const family = packageFamily(app?.windowsAppId);
  const candidates = [
    family && windowsTerminalAlias(family),
    app?.path && /\.exe$/i.test(app.path) && !/\\Program Files\\WindowsApps\\/i.test(app.path) ? app.path : undefined,
    windowsTerminalAlias(),
  ];
  return candidates.filter((path): path is string => Boolean(path));
}

/**
 * Windows Terminal ignores the working directory it is launched from and starts every profile
 * in its configured `startingDirectory` (the user's home by default), so it needs `-d`. Detect
 * it from whatever the app picker filled in: the alias path, the package identity, or the name
 * the Start menu shows on Windows 11, which is plainly "Terminal".
 */
export function isWindowsTerminal(app: Pick<Application, "name" | "path" | "windowsAppId">): boolean {
  return (
    /(^|[\\/])wt\.exe$/i.test(app.path) ||
    /WindowsTerminal/i.test(app.windowsAppId ?? "") ||
    /^(Windows )?Terminal$/i.test(app.name)
  );
}

// ---------------------------------------------------------------------------
// Default terminal application
// ---------------------------------------------------------------------------

/**
 * Windows 11 exposes "Default terminal application" under Settings → System → For developers.
 * It stores the CLSID of the host that console programs are delegated to. The values below are
 * the ones Microsoft documents (see "Default terminal application" in the Windows Terminal
 * group policy reference): the all-zero "Let Windows decide", which resolves to Windows Terminal
 * whenever it is installed, the classic console host, and Windows Terminal stable and preview.
 * Anything else is a host we cannot start ourselves — but launching a console program through
 * `start` lets Windows delegate it there.
 */
const STARTUP_KEY = "HKCU\\Console\\%%Startup";
export const AUTOMATIC_CLSID = "{00000000-0000-0000-0000-000000000000}";
export const CONHOST_CLSID = "{B23D10C0-E52E-411E-9D5B-C09FDF709C7D}";
export const WINDOWS_TERMINAL_CLSIDS = [
  "{E12CFF52-A866-4C77-9A90-F570A7AA2C6B}", // Windows Terminal
  "{86633F1F-6454-40EC-89CE-DA4EBA977EE2}", // Windows Terminal Preview
];

/** Extracts the DelegationTerminal CLSID from `reg query` output; undefined when it is unset. */
export function parseDelegationTerminal(regOutput: string): string | undefined {
  const match = /^\s*DelegationTerminal\s+REG_SZ\s+(\{[0-9a-f-]{36}\})\s*$/im.exec(regOutput);
  return match?.[1].toUpperCase();
}

async function defaultTerminalClsid(): Promise<string | undefined> {
  try {
    // `%%` reaches reg.exe untouched: execFile does not go through cmd.exe, so nothing expands it.
    const { stdout } = await execFileAsync(join(SYSTEM32, "reg.exe"), [
      "query",
      STARTUP_KEY,
      "/v",
      "DelegationTerminal",
    ]);
    return parseDelegationTerminal(stdout);
  } catch {
    // The value only exists once the setting has been touched; missing means "Let Windows decide".
    return undefined;
  }
}

export type Launcher = "windows-terminal" | "powershell";

/**
 * Picks how to open the folder when no app is chosen. Windows Terminal is started directly so its
 * default profile applies. Every other host — the classic console, or one we do not recognise —
 * cannot be started on its own, so PowerShell is opened in a console window instead and Windows
 * hosts it wherever the setting says. An unset value means the setting was never touched, which
 * is the automatic choice.
 */
export function chooseLauncher(clsid: string | undefined, windowsTerminalInstalled: boolean): Launcher {
  if (!windowsTerminalInstalled) return "powershell";
  const wanted = clsid ?? AUTOMATIC_CLSID;
  return wanted === AUTOMATIC_CLSID || WINDOWS_TERMINAL_CLSIDS.includes(wanted) ? "windows-terminal" : "powershell";
}

// ---------------------------------------------------------------------------
// Launching
// ---------------------------------------------------------------------------

/**
 * The `cmd.exe /c` payload that opens an executable in a new window with a given working
 * directory. The extension host is a GUI process without a console, so a console app spawned
 * from it directly gets no window at all; `start` gives it one. `start` takes the first quoted
 * argument as the window title, hence the empty `""` — without it a quoted exe path would be
 * swallowed as the title.
 *
 * The paths travel through environment variables rather than being spliced into the line: cmd
 * expands `%NAME%` even inside quotes, so a folder literally called `%TEMP%-2026` would resolve
 * to the wrong place, and `^` cannot escape a `%` here. An expanded variable is not scanned
 * again, and `/v:off` keeps `!` from being touched on machines with delayed expansion enabled.
 * Double quotes cannot appear in Windows paths, so the quoting itself is safe.
 */
export const START_CWD_VARIABLE = "DATED_FOLDER_CWD";
export const START_EXE_VARIABLE = "DATED_FOLDER_EXE";

export function startCommandLine(args: string[] = []): string {
  return ["start", '""', "/D", `"%${START_CWD_VARIABLE}%"`, `"%${START_EXE_VARIABLE}%"`, ...args].join(" ");
}

/**
 * cmd exits as soon as `start` returns, and Node fires `exit` before the last stderr chunk has
 * necessarily arrived. Waiting for `close` instead is not an option: the terminal that `start`
 * launched can inherit the pipe and keep it open for its whole lifetime. So on failure, give the
 * pipe a moment to drain and then report whatever cmd managed to say.
 */
function drainStderr(stream: NodeJS.ReadableStream, collected: () => string, graceMs = 500): Promise<string> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      resolve(collected().trim());
    };
    const timer = setTimeout(finish, graceMs);
    stream.once("end", finish);
  });
}

function startInFolder(cwd: string, exe: string, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    // `/s` makes cmd strip exactly the outer pair of quotes and take the rest verbatim.
    const child = spawn(COMSPEC, ["/d", "/s", "/v:off", "/c", `"${startCommandLine(args)}"`], {
      cwd,
      env: { ...process.env, [START_CWD_VARIABLE]: cwd, [START_EXE_VARIABLE]: exe },
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
      windowsVerbatimArguments: true,
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", reject);
    child.once("exit", async (code) => {
      if (code === 0) return resolve();
      const message = await drainStderr(child.stderr, () => stderr);
      reject(new Error(message || `Could not start ${exe} (exit code ${code})`));
    });
  });
}

function spawnDetached(exe: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, { cwd, detached: true, stdio: "ignore", windowsHide: false });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

/**
 * Opens `target` in a terminal and resolves with the name to show in the HUD. With no app
 * chosen, the system's default terminal application decides between Windows Terminal (whose
 * default profile then picks the shell) and a PowerShell console window.
 */
export async function openInWindowsTerminal(target: string, app?: Application): Promise<string> {
  if (app && !isWindowsTerminal(app)) {
    // Packaged apps can come without an executable path; `start` would open a bare cmd window.
    if (!app.path) throw new Error(`${app.name} has no executable path — choose another terminal in the preferences`);
    await startInFolder(target, app.path);
    return app.name;
  }
  const wt = windowsTerminalCandidates(app).find((path) => existsSync(path));
  if (app) {
    // The user asked for Windows Terminal by name; swapping in PowerShell would be a surprise.
    if (!wt) throw new Error(`${app.name} was not found — is its app execution alias enabled?`);
    await spawnDetached(wt, ["-d", target], target);
    return app.name;
  }
  if (chooseLauncher(await defaultTerminalClsid(), wt !== undefined) === "windows-terminal" && wt) {
    await spawnDetached(wt, ["-d", target], target);
    return "Windows Terminal";
  }
  await startInFolder(target, WINDOWS_POWERSHELL, ["-NoLogo"]);
  return "Windows PowerShell";
}
