import { Application, closeMainWindow, environment, getApplications, open } from "@raycast/api";
import { runPowerShellScript } from "@raycast/utils";
import { execFile } from "child_process";
import { existsSync, readFileSync } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const isWindows = process.platform === "win32";

type HelperAction = "explorer-folder" | "list-windows" | "focus-window" | "close-windows";

let encodedHelper: string | undefined;

async function runHelper<T>(action: HelperAction, extraArgs: string[] = []): Promise<T> {
  // runPowerShellScript runs the script line by line, so the helper is passed as a single line.
  encodedHelper ??= readFileSync(path.join(environment.assetsPath, "windows-helper.ps1")).toString("base64");
  const script = [
    `& ([scriptblock]::Create([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedHelper}'))))`,
    `-Action ${action}`,
    ...extraArgs,
  ].join(" ");
  const output = await runPowerShellScript(`${script}\n`, { timeout: 20000 });
  return JSON.parse(output.trim()) as T;
}

export function getAppDataPath(): string {
  return process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
}

export function getCursorExecutable(): string {
  const localAppData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
  const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
  const fromPath = (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter((dir) => dir && existsSync(path.join(dir, "cursor.cmd")))
    .map((dir) => path.resolve(dir, "..", "..", "..", "Cursor.exe"));

  const candidates = [
    path.join(localAppData, "Programs", "cursor", "Cursor.exe"),
    path.join(programFiles, "cursor", "Cursor.exe"),
    ...fromPath,
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("Cursor.exe was not found. Is Cursor installed?");
  }
  return found;
}

// Cursor isn't always in Raycast's Windows app list, so fall back to the path of Cursor.exe.
export async function getCursorApplication(): Promise<Application | string> {
  const apps = await getApplications();
  const app = apps.find(
    (candidate) =>
      candidate.name.toLowerCase() === "cursor" || path.win32.basename(candidate.path).toLowerCase() === "cursor.exe"
  );
  return app ?? getCursorExecutable();
}

export async function openInCursor(target: string): Promise<void> {
  await open(target, await getCursorApplication());
}

export async function openCursorNewWindow(): Promise<void> {
  await open(getCursorExecutable());
}

// A running Cursor opens the URI right away through its CLI; the cursor:// link asks for confirmation first.
export async function openRemoteInCursor(
  uri: string,
  options: { isWorkspace: boolean; reuseWindow: boolean; fallbackUrl: string }
): Promise<void> {
  const isRunning = (await getCursorWindows().catch(() => [])).length > 0;
  if (!isRunning) {
    await open(options.fallbackUrl);
    return;
  }
  await closeMainWindow();
  await runCursorCLI([
    options.reuseWindow ? "--reuse-window" : "--new-window",
    options.isWorkspace ? "--file-uri" : "--folder-uri",
    uri,
  ]);
}

function isWindowsTerminal(app: Application): boolean {
  return (
    app.windowsAppId?.startsWith("Microsoft.WindowsTerminal") === true ||
    path.win32.basename(app.path).toLowerCase() === "wt.exe"
  );
}

// Windows Terminal ignores a folder opened through a file association, so start it with `-d`.
export async function openFolderInTerminal(folder: string, terminal?: Application): Promise<void> {
  if (isWindows && terminal && isWindowsTerminal(terminal)) {
    await execFileAsync("wt.exe", ["-d", folder]);
    return;
  }
  await open(folder, terminal);
}

export async function runCursorCLI(args: string[]): Promise<void> {
  const executable = getCursorExecutable();
  const cli = path.join(path.dirname(executable), "resources", "app", "out", "cli.js");
  await execFileAsync(executable, [cli, ...args], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    windowsHide: true,
  });
}

export async function getCurrentExplorerPath(): Promise<string> {
  const { folder } = await runHelper<{ folder: string | null }>("explorer-folder");
  return folder ?? "";
}

export interface CursorWindowHandle {
  handle: number;
  title: string;
}

export async function getCursorWindows(): Promise<CursorWindowHandle[]> {
  return runHelper<CursorWindowHandle[]>("list-windows");
}

export async function focusWindow(handle: number): Promise<void> {
  const focused = await runHelper<boolean>("focus-window", ["-Handle", String(handle)]);
  if (!focused) {
    throw new Error("Could not focus the Cursor window. Refresh and try again.");
  }
}

export async function closeCursorWindows(): Promise<void> {
  const closed = await runHelper<number>("close-windows");
  if (closed > 0) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

const RECENT_ENTRIES_KEY = "history.recentlyOpenedPathsList";

export async function readRecentEntriesJSON(databasePath: string): Promise<string | undefined> {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(databasePath, { readOnly: true, timeout: 2000 });
  try {
    const row = db
      .prepare("SELECT json_extract(value, '$.entries') AS entries FROM ItemTable WHERE key = ?")
      .get(RECENT_ENTRIES_KEY) as { entries?: string } | undefined;
    return row?.entries;
  } finally {
    db.close();
  }
}

export async function writeRecentEntriesJSON(databasePath: string, data: string): Promise<void> {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(databasePath, { timeout: 2000 });
  try {
    db.prepare("INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)").run(RECENT_ENTRIES_KEY, data);
  } finally {
    db.close();
  }
}
