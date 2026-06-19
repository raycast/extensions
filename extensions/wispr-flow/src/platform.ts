import { execFile } from "child_process";
import { existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";
import { getApplications, open, showToast, Toast } from "@raycast/api";

const execFileAsync = promisify(execFile);

export const WISPR_FLOW_BUNDLE_ID = "com.electron.wispr-flow";

export interface PlatformAdapter {
  getDefaultDbPath(): string;
  isWisprFlowInstalled(): Promise<boolean>;
  openWisprFlow(url: string): Promise<void>;
}

class MacOSPlatform implements PlatformAdapter {
  getDefaultDbPath(): string {
    return join(
      homedir(),
      "Library",
      "Application Support",
      "Wispr Flow",
      "flow.sqlite",
    );
  }

  async isWisprFlowInstalled(): Promise<boolean> {
    const apps = await getApplications();
    return apps.some(({ bundleId }) => bundleId === WISPR_FLOW_BUNDLE_ID);
  }

  async openWisprFlow(url: string): Promise<void> {
    await open(url, WISPR_FLOW_BUNDLE_ID);
  }
}

class WindowsPlatform implements PlatformAdapter {
  getDefaultDbPath(): string {
    return join(
      homedir(),
      "AppData",
      "Roaming",
      "Wispr Flow",
      "flow.sqlite",
    ).replace(/\\/g, "/");
  }

  async isWisprFlowInstalled(): Promise<boolean> {
    const searchDirs = [
      process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"),
      process.env.PROGRAMFILES ?? "C:\\Program Files",
      process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)",
    ];
    for (const base of searchDirs) {
      const wisprDir = join(base, "WisprFlow");
      if (!existsSync(wisprDir)) continue;
      if (existsSync(join(wisprDir, "Wispr Flow.exe"))) return true;
      try {
        if (
          readdirSync(wisprDir).some(
            (e) =>
              e.startsWith("app-") &&
              existsSync(join(wisprDir, e, "Wispr Flow.exe")),
          )
        )
          return true;
      } catch {
        /* continue */
      }
    }
    return false;
  }

  async openWisprFlow(url: string): Promise<void> {
    try {
      await open(url);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open Wispr Flow",
        message: "Please open Wispr Flow manually.",
      });
    }
  }
}

export async function getWindowsAppPathMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const ps = [
      "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
      "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
    ].join("','");
    const script = `Get-ItemProperty '${ps}' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayIcon } | ForEach-Object { $icon = $_.DisplayIcon -replace '(,[^,]+)?$' -replace '"',''; if ($icon -match '\\.exe$' -and (Test-Path $icon)) { "$([io.path]::GetFileNameWithoutExtension($icon).ToLower())|$icon" } } | Sort-Object -Unique`;
    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      script,
    ]);
    for (const line of stdout.trim().split(/\r?\n/)) {
      const [name, path] = line.split("|");
      if (name && path) map.set(name, path);
    }
  } catch {
    // not critical when fails
  }
  return map;
}

export function createPlatformAdapter(): PlatformAdapter {
  return process.platform === "win32"
    ? new WindowsPlatform()
    : new MacOSPlatform();
}

export const platform: PlatformAdapter = createPlatformAdapter();
