import { access } from "fs/promises";
import { constants } from "fs";
import { homedir } from "os";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { expandUserPath, isWindows } from "./path-utils";

const execFileAsync = promisify(execFile);

async function isUsableAdbPath(path: string): Promise<boolean> {
  try {
    // Windows .exe files: F_OK; Unix: require execute permission
    const mode = isWindows() ? constants.F_OK : constants.X_OK;
    await access(path, mode);
    return true;
  } catch {
    return false;
  }
}

function androidSdkAdbCandidates(): string[] {
  const androidHome = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (!androidHome) {
    return [];
  }
  const exe = isWindows() ? "adb.exe" : "adb";
  return [join(androidHome, "platform-tools", exe)];
}

function commonAdbCandidates(): string[] {
  const home = homedir();

  if (isWindows()) {
    const localAppData = process.env.LOCALAPPDATA ?? join(home, "AppData", "Local");
    const programFiles = process.env["ProgramFiles"] ?? "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";

    return [
      ...androidSdkAdbCandidates(),
      join(localAppData, "Android", "Sdk", "platform-tools", "adb.exe"),
      join(programFiles, "Android", "android-sdk", "platform-tools", "adb.exe"),
      join(programFilesX86, "Android", "android-sdk", "platform-tools", "adb.exe"),
      "C:\\Android\\platform-tools\\adb.exe",
      join(home, "AppData", "Local", "Android", "Sdk", "platform-tools", "adb.exe"),
    ];
  }

  return [
    ...androidSdkAdbCandidates(),
    "/opt/homebrew/bin/adb",
    "/usr/local/bin/adb",
    join(home, "Library/Android/sdk/platform-tools/adb"),
    "/usr/local/share/android-sdk/platform-tools/adb",
    join(home, "Android/Sdk/platform-tools/adb"),
  ];
}

function unixPathEnv(): string {
  const home = homedir();
  return [
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    "/usr/local/bin",
    join(home, "Library/Android/sdk/platform-tools"),
    process.env.PATH,
  ]
    .filter(Boolean)
    .join(":");
}

function windowsPathEnv(): string {
  const home = homedir();
  const localAppData = process.env.LOCALAPPDATA ?? join(home, "AppData", "Local");
  const androidHome = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  const segments = [
    join(localAppData, "Android", "Sdk", "platform-tools"),
    androidHome ? join(androidHome, "platform-tools") : "",
    join(process.env["ProgramFiles"] ?? "C:\\Program Files", "Android", "android-sdk", "platform-tools"),
    process.env.PATH,
  ].filter(Boolean);
  return segments.join(";");
}

async function findAdbViaShell(): Promise<string | undefined> {
  if (isWindows()) {
    return findAdbOnWindows();
  }
  return findAdbOnUnix();
}

async function findAdbOnUnix(): Promise<string | undefined> {
  const pathEnv = unixPathEnv();
  const execOptions = { env: { ...process.env, PATH: pathEnv } };

  const attempts: Array<{ file: string; args: string[] }> = [
    { file: "/bin/zsh", args: ["-l", "-c", "command -v adb"] },
    { file: "/bin/bash", args: ["-l", "-c", "command -v adb"] },
    { file: "which", args: ["adb"] },
  ];

  for (const { file, args } of attempts) {
    try {
      const { stdout } = await execFileAsync(file, args, execOptions);
      const resolved = stdout.trim().split(/\r?\n/)[0]?.trim();
      if (resolved && (await isUsableAdbPath(resolved))) {
        return resolved;
      }
    } catch {
      // try next
    }
  }

  return undefined;
}

async function findAdbOnWindows(): Promise<string | undefined> {
  const pathEnv = windowsPathEnv();
  const env = { ...process.env, PATH: pathEnv };
  const execOptions = { env, windowsHide: true as const };

  const comspec = process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe";
  try {
    const { stdout } = await execFileAsync(comspec, ["/d", "/s", "/c", "where adb"], execOptions);
    for (const line of stdout.split(/\r?\n/)) {
      const candidate = line.trim();
      if (candidate && (await isUsableAdbPath(candidate))) {
        return candidate;
      }
    }
  } catch {
    // try PowerShell
  }

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-Command", "(Get-Command adb -ErrorAction SilentlyContinue).Source"],
      execOptions,
    );
    const candidate = stdout.trim().split(/\r?\n/)[0]?.trim();
    if (candidate && (await isUsableAdbPath(candidate))) {
      return candidate;
    }
  } catch {
    // not found
  }

  return undefined;
}

function notFoundMessage(): string {
  if (isWindows()) {
    return (
      "`adb` was not found. Install [Android platform-tools](https://developer.android.com/tools/releases/platform-tools), " +
      "or set **ADB Path** in extension preferences (e.g. `%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe`)."
    );
  }
  return (
    "`adb` was not found. Install [Android platform-tools](https://developer.android.com/tools/releases/platform-tools), " +
    "or set **ADB Path** in extension preferences (e.g. `/opt/homebrew/bin/adb` or `~/Library/Android/sdk/platform-tools/adb`)."
  );
}

export class AdbNotFoundError extends Error {
  constructor() {
    super(notFoundMessage());
    this.name = "AdbNotFoundError";
  }
}

/** Resolve adb to an absolute path. Raycast’s environment often omits SDK/Homebrew paths from PATH. */
export async function resolveAdbPath(preference?: string): Promise<string> {
  const trimmed = preference?.trim();
  if (trimmed) {
    const expanded = expandUserPath(trimmed);
    if (!(await isUsableAdbPath(expanded))) {
      throw new Error(`ADB not found or not executable at: ${expanded}`);
    }
    return expanded;
  }

  for (const candidate of commonAdbCandidates()) {
    if (await isUsableAdbPath(candidate)) {
      return candidate;
    }
  }

  const fromShell = await findAdbViaShell();
  if (fromShell) {
    return fromShell;
  }

  throw new AdbNotFoundError();
}
