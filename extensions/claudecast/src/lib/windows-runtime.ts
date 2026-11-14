import { execFile, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";

const execFilePromise = promisify(execFile);

export type WindowsTerminalApp =
  | "Windows Terminal"
  | "PowerShell"
  | "Windows PowerShell"
  | "Command Prompt";

function getEnvironmentValue(
  env: NodeJS.ProcessEnv,
  name: string,
): string | undefined {
  const key = Object.keys(env).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  );
  return key ? env[key] : undefined;
}

function getSystem32Executable(name: string): string {
  return path.win32.join(
    process.env.SystemRoot || "C:\\Windows",
    "System32",
    name,
  );
}

function expandWindowsEnvironment(value: string): string {
  return value.replace(/%([^%]+)%/g, (match, name: string) => {
    const existing = getEnvironmentValue(process.env, name);
    if (existing) return existing;
    const home = os.homedir();
    switch (name.toUpperCase()) {
      case "USERPROFILE":
        return home;
      case "APPDATA":
        return path.win32.join(home, "AppData", "Roaming");
      case "LOCALAPPDATA":
        return path.win32.join(home, "AppData", "Local");
      case "SYSTEMROOT":
        return "C:\\Windows";
      default:
        return match;
    }
  });
}

async function readRegistryPath(key: string): Promise<string> {
  try {
    const { stdout } = await execFilePromise(
      getSystem32Executable("reg.exe"),
      ["query", key, "/v", "Path"],
      { windowsHide: true },
    );
    const match = /\bPath\s+REG(?:_EXPAND)?_SZ\s+(.+)/i.exec(stdout);
    return match ? expandWindowsEnvironment(match[1].trim()) : "";
  } catch {
    return "";
  }
}

function uniquePathEntries(entries: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const entry of entries) {
    const unquoted = entry.trim().replace(/^"|"$/g, "");
    const clean = /^[A-Za-z]:\\$/.test(unquoted)
      ? unquoted
      : unquoted.replace(/\\+$/, "");
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(clean);
  }
  return unique;
}

/** Recover PATH from the process, registry, and standard tool locations. */
export async function getWindowsPath(): Promise<string> {
  const [machinePath, userPath] = await Promise.all([
    readRegistryPath(
      "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment",
    ),
    readRegistryPath("HKCU\\Environment"),
  ]);

  const home = os.homedir();
  const appData =
    process.env.APPDATA || path.win32.join(home, "AppData", "Roaming");
  const localAppData =
    process.env.LOCALAPPDATA || path.win32.join(home, "AppData", "Local");
  const candidates = [
    getEnvironmentValue(process.env, "Path") || "",
    machinePath,
    userPath,
    getSystem32Executable(""),
    path.win32.join(home, ".local", "bin"),
    path.win32.join(appData, "npm"),
    path.win32.join(localAppData, "Microsoft", "WinGet", "Links"),
    path.win32.join(localAppData, "Programs", "Microsoft VS Code", "bin"),
  ].flatMap((value) => value.split(";"));

  return uniquePathEntries(candidates).join(";");
}

export async function getWindowsEnvironment(): Promise<NodeJS.ProcessEnv> {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.toLowerCase() === "path") delete env[key];
    if (key === "LANG" || key.startsWith("LC_")) delete env[key];
  }
  env.Path = await getWindowsPath();

  const home = os.homedir();
  const localAppData = path.win32.join(home, "AppData", "Local");
  const defaults: Record<string, string> = {
    USERPROFILE: home,
    APPDATA: path.win32.join(home, "AppData", "Roaming"),
    LOCALAPPDATA: localAppData,
    TEMP: path.win32.join(localAppData, "Temp"),
    TMP: path.win32.join(localAppData, "Temp"),
  };
  for (const [name, value] of Object.entries(defaults)) {
    if (!getEnvironmentValue(env, name)) env[name] = value;
  }
  return env;
}

export function findWindowsExecutable(
  names: string[],
  pathValue: string,
): string | null {
  for (const directory of pathValue.split(";")) {
    for (const name of names) {
      const candidate = path.win32.join(directory, name);
      try {
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch {
        // Continue through inaccessible and missing PATH entries.
      }
    }
  }
  return null;
}

export function quotePowerShellArgument(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function encodePowerShellCommand(
  command: string,
  cwd: string,
  pathValue: string,
): string {
  const script = [
    '$ErrorActionPreference = "Stop"',
    `$env:Path = ${quotePowerShellArgument(pathValue)}`,
    `Set-Location -LiteralPath ${quotePowerShellArgument(cwd)}`,
    command,
  ].join("\n");
  return Buffer.from(script, "utf16le").toString("base64");
}

export function getWindowsPowerShellPath(): string {
  return path.win32.join(
    process.env.SystemRoot || "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
}

export function encodePowerShellInvocation(
  executable: string,
  args: string[],
): string {
  const decodedArgs = args.map((argument) => {
    const encoded = Buffer.from(argument, "utf8").toString("base64");
    return `[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}'))`;
  });
  const script = [
    `$claudeArgs = @(${decodedArgs.join(",")})`,
    `& ${quotePowerShellArgument(executable)} @claudeArgs`,
    "exit $LASTEXITCODE",
  ].join("\n");
  return Buffer.from(script, "utf16le").toString("base64");
}

function waitForSpawn(child: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolve, reject) => {
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
    child.once("error", reject);
  });
}

export function buildWindowsTerminalArgs(
  cwd: string,
  encodedCommand: string,
  powerShellPath: string,
  openIn: "window" | "tab",
): string[] {
  return [
    "-w",
    openIn === "tab" ? "0" : "-1",
    "new-tab",
    "--startingDirectory",
    cwd,
    powerShellPath,
    "-NoLogo",
    "-NoProfile",
    "-NoExit",
    "-EncodedCommand",
    encodedCommand,
  ];
}

export function buildWindowsTerminalWslArgs(
  wslArgs: string[],
  openIn: "window" | "tab",
): string[] {
  return [
    "-w",
    openIn === "tab" ? "0" : "-1",
    "new-tab",
    "wsl.exe",
    ...wslArgs,
  ];
}

export async function openWindowsTerminalWithCommand(
  command: string,
  cwd: string,
  terminal: WindowsTerminalApp,
  openIn: "window" | "tab",
): Promise<void> {
  const env = await getWindowsEnvironment();
  const pathValue = getEnvironmentValue(env, "Path") || "";
  const encoded = encodePowerShellCommand(command, cwd, pathValue);
  const systemPowerShell = getWindowsPowerShellPath();

  if (terminal === "Windows Terminal") {
    const windowId = openIn === "tab" ? "0" : "-1";
    const child = spawn(
      "wt.exe",
      buildWindowsTerminalArgs(
        cwd,
        encoded,
        systemPowerShell,
        windowId === "0" ? "tab" : "window",
      ),
      { detached: true, stdio: "ignore", env, cwd, windowsHide: false },
    );
    try {
      return await waitForSpawn(child);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return openWindowsTerminalWithCommand(
        command,
        cwd,
        "Windows PowerShell",
        "window",
      );
    }
  }

  const requestedShell =
    terminal === "PowerShell"
      ? findWindowsExecutable(["pwsh.exe"], pathValue)
      : systemPowerShell;
  if (!requestedShell) throw new Error("PowerShell 7 is not installed");

  const comspec = process.env.ComSpec || getSystem32Executable("cmd.exe");
  const inner =
    terminal === "Command Prompt"
      ? `start "" cmd.exe /d /k ""${requestedShell}" -NoLogo -NoProfile -NoExit -EncodedCommand ${encoded}"`
      : `start "" "${requestedShell}" -NoLogo -NoProfile -NoExit -EncodedCommand ${encoded}`;
  const child = spawn(comspec, ["/d", "/s", "/c", `"${inner}"`], {
    detached: true,
    stdio: "ignore",
    env,
    cwd,
    windowsHide: true,
    windowsVerbatimArguments: true,
  });
  return waitForSpawn(child);
}

export async function openWindowsWslWithArgs(
  wslArgs: string[],
  openIn: "window" | "tab",
): Promise<void> {
  const env = await getWindowsEnvironment();
  const terminal = spawn(
    "wt.exe",
    buildWindowsTerminalWslArgs(wslArgs, openIn),
    {
      detached: true,
      stdio: "ignore",
      env,
      windowsHide: false,
    },
  );
  try {
    await waitForSpawn(terminal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const child = spawn("wsl.exe", wslArgs, {
      detached: true,
      stdio: "ignore",
      env,
      windowsHide: false,
    });
    await waitForSpawn(child);
  }
}

export async function getAvailableWindowsTerminals(): Promise<
  WindowsTerminalApp[]
> {
  const pathValue = await getWindowsPath();
  const terminals: WindowsTerminalApp[] = [
    "Windows PowerShell",
    "Command Prompt",
  ];
  if (findWindowsExecutable(["wt.exe"], pathValue)) {
    terminals.unshift("Windows Terminal");
  }
  if (findWindowsExecutable(["pwsh.exe"], pathValue)) {
    terminals.push("PowerShell");
  }
  return terminals;
}
