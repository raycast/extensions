import { exec } from "child_process";
import { getPreferenceValues } from "@raycast/api";
import { promisify } from "util";
import { getErrorMessage } from "./errors";

const execAsync = promisify(exec);

import { existsSync } from "fs";
import { homedir } from "os";

export function getAdbPath(): string {
  const preferences = getPreferenceValues<Preferences.ExtensionPreferences>();
  const adbPath = preferences.adbPath?.trim();

  // If the user hasn't changed it from the default "adb", or it's empty, try to auto-detect
  if (adbPath && adbPath !== "adb") {
    return adbPath;
  }

  // Auto-detect common paths if not explicitly set
  const commonPaths = [
    `${homedir()}/Library/Android/sdk/platform-tools/adb`, // Android Studio SDK
    "/opt/homebrew/bin/adb", // Homebrew Apple Silicon
    "/usr/local/bin/adb", // Homebrew Intel
  ];

  for (const p of commonPaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  return "adb"; // Fallback to PATH
}

export async function execAdb(
  command: string,
  deviceId?: string,
): Promise<string> {
  const adbPath = getAdbPath();
  const deviceFlag = deviceId ? `-s ${deviceId}` : "";
  const fullCommand = `${adbPath} ${deviceFlag} ${command}`;

  try {
    const { stdout, stderr } = await execAsync(fullCommand);
    if (stderr && !stdout) {
      console.warn(`ADB Stderr: ${stderr}`);
    }
    return stdout;
  } catch (error) {
    if (isExecError(error) && error.stderr) {
      throw new Error(error.stderr);
    }
    throw new Error(getErrorMessage(error));
  }
}

function isExecError(error: unknown): error is { stderr?: string } {
  return typeof error === "object" && error !== null && "stderr" in error;
}

export interface AdbDevice {
  id: string;
  state: string;
  model: string;
}

export async function getDevices(): Promise<AdbDevice[]> {
  const stdout = await execAdb("devices -l");
  const lines = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  lines.shift(); // Remove "List of devices attached"

  return lines.map((line) => {
    const match = line.match(/^(\S+)\s+(\S+)\s+(.*)$/);
    if (!match)
      return { id: line.split(/\s+/)[0], state: "unknown", model: "Unknown" };

    const id = match[1];
    const state = match[2];
    const details = match[3];

    const modelMatch = details.match(/model:(\S+)/);
    const model = modelMatch
      ? modelMatch[1].replace(/_/g, " ")
      : "Unknown Device";

    return { id, state, model };
  });
}

export interface AdbUser {
  id: string;
  name: string;
  running: boolean;
}

export async function getUsers(deviceId?: string): Promise<AdbUser[]> {
  const stdout = await execAdb("shell pm list users", deviceId);
  const lines = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  lines.shift(); // Remove "Users:"

  const preferences = getPreferenceValues<Preferences.ExtensionPreferences>();
  const showSystemProfiles = preferences.showSystemProfiles ?? false;

  const users = lines.map((line) => {
    // Example: UserInfo{0:Owner:13} running
    const match = line.match(/UserInfo\{(\d+):([^:]+):\d+\}(.*)/);
    if (match) {
      return {
        id: match[1],
        name: match[2],
        running: match[3].includes("running"),
      };
    }
    return { id: "0", name: "Owner", running: true };
  });

  if (showSystemProfiles) {
    return users;
  }

  // Filter out typical system profiles (95 = Dual App, 150 = Secure Folder, 999 = Dual App Xiaomi)
  const hiddenIds = ["95", "150", "999"];
  return users.filter((u) => !hiddenIds.includes(u.id));
}

export interface AdbPackage {
  pkg: string;
  name: string;
}

function formatAppName(pkg: string): string {
  // Specific fallbacks for popular apps or user's specific apps
  const commonNames: Record<string, string> = {
    "com.zhiliaoapp.musically": "TikTok",
    "com.tencent.mm": "WeChat",
    "com.ss.android.ugc.aweme": "TikTok",
    "com.ss.android.ugc.trill": "TikTok",
    "com.facebook.katana": "Facebook",
    "com.facebook.orca": "Messenger",
    "com.twitter.android": "Twitter (X)",
    "com.instagram.android": "Instagram",
    "com.google.android.gm": "Gmail",
    "com.viber.voip": "Viber",
    "com.skype.raider": "Skype",
    "org.telegram.messenger": "Telegram",
    "com.snapchat.android": "Snapchat",
    "com.spotify.music": "Spotify",
    "com.google.android.youtube": "YouTube",
    "com.fampay.in": "FamApp",
    "com.fampay.in.debug": "FamApp Debug",
    "com.fampay.in.beta": "FamApp Beta",
  };

  if (commonNames[pkg]) return commonNames[pkg];

  const parts = pkg.split(".");

  // Filter out common meaningless parts
  const ignore = new Set([
    "com",
    "org",
    "net",
    "in",
    "co",
    "app",
    "android",
    "mobile",
    "www",
  ]);
  const meaningfulParts = parts.filter((p) => !ignore.has(p.toLowerCase()));

  if (meaningfulParts.length === 0) {
    return pkg;
  }

  let name = meaningfulParts[meaningfulParts.length - 1];

  // If the last part is a generic build type and we have more parts, prepend the previous part
  const suffixes = new Set(["debug", "release", "beta", "demo", "sso", "test"]);
  if (suffixes.has(name.toLowerCase()) && meaningfulParts.length > 1) {
    name = meaningfulParts[meaningfulParts.length - 2] + " " + name;
  }

  // Capitalize words and replace underscores with spaces
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function getPackages(
  userId: string,
  deviceId?: string,
): Promise<AdbPackage[]> {
  const stdout = await execAdb(
    `shell pm list packages --user ${userId}`,
    deviceId,
  );
  const lines = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("package:"));
  return lines.map((line) => {
    const pkg = line.replace("package:", "");
    return { pkg, name: formatAppName(pkg) };
  });
}

export async function installApk(
  filePath: string,
  userId?: string,
  deviceId?: string,
): Promise<string> {
  const userFlag = userId ? `--user ${userId}` : "";
  return await execAdb(`install ${userFlag} "${filePath}"`, deviceId);
}

export async function takeScreenshot(
  destinationFile: string,
  deviceId?: string,
): Promise<void> {
  await execAdb(`exec-out screencap -p > "${destinationFile}"`, deviceId);
}

export async function clearAppData(
  packageName: string,
  deviceId?: string,
): Promise<void> {
  await execAdb(`shell pm clear ${packageName}`, deviceId);
}

export async function uninstallApp(
  packageName: string,
  userId?: string,
  deviceId?: string,
): Promise<void> {
  const userFlag = userId ? `--user ${userId}` : "";
  await execAdb(`uninstall ${userFlag} ${packageName}`, deviceId);
}
