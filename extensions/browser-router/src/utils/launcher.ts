import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { BrowserProfile } from "../types";

function getCleanBrowserEnv(): NodeJS.ProcessEnv {
  if (process.platform === "win32") {
    const standardWindowsKeys = new Set([
      "ALLUSERSPROFILE",
      "APPDATA",
      "COMMONPROGRAMFILES",
      "COMMONPROGRAMFILES(X86)",
      "COMMONPROGRAMW6432",
      "COMPUTERNAME",
      "COMSPEC",
      "DRIVERDATA",
      "HOMEDRIVE",
      "HOMEPATH",
      "LOCALAPPDATA",
      "LOGONSERVER",
      "NUMBER_OF_PROCESSORS",
      "ONEDRIVE",
      "OS",
      "PATH",
      "PATHEXT",
      "PROCESSOR_ARCHITECTURE",
      "PROCESSOR_IDENTIFIER",
      "PROCESSOR_LEVEL",
      "PROCESSOR_REVISION",
      "PROGRAMDATA",
      "PROGRAMFILES",
      "PROGRAMFILES(X86)",
      "PROGRAMW6432",
      "PSMODULEPATH",
      "PUBLIC",
      "SYSTEMDRIVE",
      "SYSTEMROOT",
      "TEMP",
      "TMP",
      "USERDOMAIN",
      "USERDOMAIN_ROAMINGPROFILE",
      "USERNAME",
      "USERPROFILE",
      "WINDIR",
    ]);

    const cleanEnv: NodeJS.ProcessEnv = {};
    for (const [key, value] of Object.entries(process.env)) {
      const upperKey = key.toUpperCase();
      if (
        standardWindowsKeys.has(upperKey) ||
        upperKey === "HTTP_PROXY" ||
        upperKey === "HTTPS_PROXY" ||
        upperKey === "ALL_PROXY" ||
        upperKey === "NO_PROXY"
      ) {
        cleanEnv[key] = value;
      }
    }
    return cleanEnv;
  }

  const cleanEnv: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    const upperKey = key.toUpperCase();
    if (
      upperKey.startsWith("CHROME_") ||
      upperKey.startsWith("ELECTRON_") ||
      upperKey.startsWith("VSCODE_") ||
      upperKey.startsWith("ANTIGRAVITY_") ||
      upperKey.startsWith("EFC_") ||
      upperKey.startsWith("FPS_") ||
      upperKey.startsWith("NODE_") ||
      upperKey === "ORIGINAL_XDG_CURRENT_DESKTOP"
    ) {
      continue;
    }
    cleanEnv[key] = value;
  }
  return cleanEnv;
}

export async function launchBrowserProfile(
  profile: BrowserProfile,
  targetUrl?: string,
  incognito = false,
): Promise<boolean> {
  try {
    if (!profile.executablePath || !fs.existsSync(profile.executablePath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Browser not found",
        message: profile.executablePath ? `File does not exist: ${profile.executablePath}` : "No executable specified",
      });
      return false;
    }

    const exeDir = path.dirname(profile.executablePath);
    const args: string[] = [];

    if (profile.browserId === "firefox") {
      if (
        profile.profileDirectory &&
        profile.profileDirectory !== "default" &&
        profile.profileDirectory !== "Default"
      ) {
        if (path.isAbsolute(profile.profileDirectory) || fs.existsSync(profile.profileDirectory)) {
          args.push("-profile", profile.profileDirectory);
        } else {
          args.push("-P", profile.profileDirectory);
        }
      }
      if (incognito) {
        args.push("-private-window");
      }
      if (targetUrl) {
        args.push(targetUrl);
      }
    } else {
      // Chromium browsers (Chrome, Edge, Brave, Vivaldi, Arc, Opera, etc.)
      if (incognito) {
        if (profile.browserId === "edge") {
          args.push("--inprivate");
        } else {
          args.push("--incognito");
        }
      }

      // Resolve custom profile directory and user-data-dir
      let udd = profile.userDataDir ? profile.userDataDir.trim().replace(/^"|"$/g, "") : undefined;
      let profileDir = profile.profileDirectory ? profile.profileDirectory.trim().replace(/^"|"$/g, "") : undefined;

      // If profileDir is an absolute path or contains directory separators, extract user-data root and subfolder
      if (profileDir && (path.isAbsolute(profileDir) || profileDir.includes("\\") || profileDir.includes("/"))) {
        if (!udd) {
          udd = path.dirname(profileDir);
        }
        profileDir = path.basename(profileDir);
      }

      // For Brave, Vivaldi, Arc, Opera, and custom profiles, passing --user-data-dir
      // ensures the browser locates its specific data folder and prevents MSIX container virtualization.
      // Chrome and Edge standard profiles are specifically EXCLUDED from --user-data-dir:
      // 1. Chrome's singleton process model treats explicit --user-data-dir as a profile boundary mismatch, evicting active sign-in sessions.
      // 2. Edge's Startup Boost background service holds an exclusive lock on its User Data directory, causing hangs.
      if (
        profile.browserId === "brave" ||
        profile.browserId === "vivaldi" ||
        profile.browserId === "arc" ||
        profile.browserId === "opera" ||
        profile.isCustom
      ) {
        if (!udd && process.platform === "win32") {
          const home = os.homedir();
          const localAppData = path.join(home, "AppData", "Local");
          const appData = path.join(home, "AppData", "Roaming");
          if (profile.browserId === "brave") {
            udd = path.join(localAppData, "BraveSoftware", "Brave-Browser", "User Data");
          } else if (profile.browserId === "vivaldi") {
            udd = path.join(localAppData, "Vivaldi", "User Data");
          } else if (profile.browserId === "arc") {
            udd = path.join(localAppData, "Arc", "User Data");
          } else if (profile.browserId === "opera") {
            udd = path.join(appData, "Opera Software", "Opera Stable");
          }
        }
        if (udd) {
          args.push(`--user-data-dir=${udd}`);
        }
      }

      // Target selected profile directory in both normal and incognito launches
      if (profileDir && profileDir !== "default-no-arg") {
        args.push(`--profile-directory=${profileDir}`);
      }

      if (targetUrl) {
        args.push(targetUrl);
      }
    }

    // Clean environment to prevent foreign Electron, IDE, or crashpad variables from polluting browser processes.
    // An allowlist ensures spawned browsers only receive standard Windows OS environment variables.
    const cleanEnv = getCleanBrowserEnv();

    const child = spawn(profile.executablePath, args, {
      detached: true,
      stdio: "ignore",
      cwd: fs.existsSync(exeDir) ? exeDir : undefined,
      env: cleanEnv,
    });

    return new Promise<boolean>((resolve) => {
      let settled = false;

      child.once("error", async (err) => {
        if (settled) return;
        settled = true;
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to launch browser",
          message: err.message,
        });
        resolve(false);
      });

      child.once("spawn", async () => {
        if (settled) return;
        settled = true;
        child.unref();

        const modeText = incognito ? " (Incognito)" : "";
        await showToast({
          style: Toast.Style.Success,
          title: `Opened in ${profile.displayName}${modeText}`,
          message: targetUrl ? (targetUrl.length > 50 ? targetUrl.substring(0, 47) + "..." : targetUrl) : undefined,
        });

        await closeMainWindow();
        resolve(true);
      });
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to launch browser",
      message,
    });
    return false;
  }
}
