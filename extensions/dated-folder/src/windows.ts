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
 * `WindowsApps` folder. The alias at the top level is shared: stable and Preview both register
 * `wt.exe`, and only one of them owns it at a time, so it never tells which build it starts.
 * Each package also gets its own copy in a subfolder named after the package family, and that is
 * the one to use whenever a specific build is meant — the shared alias is only for the case where
 * no build was named at all.
 */
export function windowsTerminalAlias(
  packageFamily?: string,
  localAppData = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"),
) {
  return join(localAppData, "Microsoft", "WindowsApps", ...(packageFamily ? [packageFamily] : []), "wt.exe");
}

export const WINDOWS_TERMINAL_FAMILY = "Microsoft.WindowsTerminal_8wekyb3d8bbwe";
export const WINDOWS_TERMINAL_PREVIEW_FAMILY = "Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe";

const PACKAGE_STORE = /\\Program Files\\WindowsApps\\/i;

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
 * The package family name out of a path into the package store, such as
 * `C:\Program Files\WindowsApps\Microsoft.WindowsTerminalPreview_1.23.0.0_x64__8wekyb3d8bbwe\wt.exe`.
 * The folder carries the package full name — name, version, architecture, resource id (usually
 * empty) and publisher hash joined by `_` — and the family is the name plus the hash. A package
 * name itself cannot contain `_`, so the split is unambiguous.
 */
export function packageFamilyFromStorePath(path?: string): string | undefined {
  const match =
    /\\Program Files\\WindowsApps\\([a-z0-9.-]+)_\d+(?:\.\d+){0,3}_[a-z0-9]+_[^\\_]*_([a-z0-9]{13})\\/i.exec(
      path ?? "",
    );
  return match ? `${match[1]}_${match[2]}` : undefined;
}

/**
 * Where to look for the Windows Terminal that `app` stands for. When the picker identifies the
 * package — through the app id, or through a path into the package store — only that package's
 * own alias will do: the shared `wt.exe` may belong to the other build, and starting it would
 * contradict the choice the HUD reports. Without a package identity there is no build to honour,
 * so the supplied executable is used, or failing that the shared alias.
 */
export function windowsTerminalCandidates(app: Pick<Application, "path" | "windowsAppId">): string[] {
  const family = packageFamily(app.windowsAppId) ?? packageFamilyFromStorePath(app.path);
  if (family) return [windowsTerminalAlias(family)];
  if (app.path && /\.exe$/i.test(app.path) && !PACKAGE_STORE.test(app.path)) return [app.path];
  return [windowsTerminalAlias()];
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
 * group policy reference): the all-zero "Let Windows decide", which resolves to the stable
 * Windows Terminal whenever it is installed, the classic console host, and Windows Terminal
 * stable and Preview, each a package of its own. Anything else is a host we cannot start
 * ourselves — but launching a console program through `start` lets Windows delegate it there.
 */
const STARTUP_KEY = "HKCU\\Console\\%%Startup";
export const AUTOMATIC_CLSID = "{00000000-0000-0000-0000-000000000000}";
export const CONHOST_CLSID = "{B23D10C0-E52E-411E-9D5B-C09FDF709C7D}";
export const WINDOWS_TERMINAL_CLSID = "{E12CFF52-A866-4C77-9A90-F570A7AA2C6B}";
export const WINDOWS_TERMINAL_PREVIEW_CLSID = "{86633F1F-6454-40EC-89CE-DA4EBA977EE2}";

export interface WindowsTerminalBuild {
  name: string;
  family: string;
}

export const WINDOWS_TERMINAL_BUILDS: ReadonlyMap<string, WindowsTerminalBuild> = new Map([
  [WINDOWS_TERMINAL_CLSID, { name: "Windows Terminal", family: WINDOWS_TERMINAL_FAMILY }],
  [WINDOWS_TERMINAL_PREVIEW_CLSID, { name: "Windows Terminal Preview", family: WINDOWS_TERMINAL_PREVIEW_FAMILY }],
]);

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

/**
 * The Windows Terminal build the default terminal setting names, when no app is chosen: stable
 * and Preview each map to their own package alias, so the build the setting picks is the one
 * started, whichever of them owns the shared `wt.exe`. An unset value means the setting was
 * never touched, which is the automatic choice, and that resolves to the stable build.
 *
 * Undefined means there is nothing to start directly: the named build is not installed, or the
 * default is the classic console host or a host we do not recognise. PowerShell is then opened
 * in a console window instead and Windows hosts it wherever the setting says.
 */
export function defaultWindowsTerminal(
  clsid: string | undefined,
  isInstalled: (exe: string) => boolean = existsSync,
): { exe: string; name: string } | undefined {
  const wanted = clsid ?? AUTOMATIC_CLSID;
  const build = WINDOWS_TERMINAL_BUILDS.get(wanted === AUTOMATIC_CLSID ? WINDOWS_TERMINAL_CLSID : wanted);
  if (!build) return undefined;
  const exe = windowsTerminalAlias(build.family);
  return isInstalled(exe) ? { exe, name: build.name } : undefined;
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
  if (app) {
    // The user asked for this build of Windows Terminal by name: neither the other build nor
    // PowerShell may stand in for it, so a missing alias is an error rather than a fallback.
    const wt = windowsTerminalCandidates(app).find((path) => existsSync(path));
    if (!wt) {
      throw new Error(`${app.name} was not found — is it still installed, with its app execution alias enabled?`);
    }
    await spawnDetached(wt, ["-d", target], target);
    return app.name;
  }
  const wt = defaultWindowsTerminal(await defaultTerminalClsid());
  if (wt) {
    await spawnDetached(wt.exe, ["-d", target], target);
    return wt.name;
  }
  await startInFolder(target, WINDOWS_POWERSHELL, ["-NoLogo"]);
  return "Windows PowerShell";
}
