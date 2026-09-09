import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { BrowserProfile } from "../types";

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
      if (incognito) {
        args.push("-private-window");
      }
      if (profile.profileDirectory && profile.profileDirectory !== "default") {
        args.push("-P", profile.profileDirectory);
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

      // For Brave, Vivaldi, Arc, Opera, and custom browsers:
      // Raycast runs as an MSIX packaged app on Windows, which can redirect CSIDL_LOCALAPPDATA to AppData\Local\Temp
      // when child processes are spawned without explicit paths. This caused cold-started browsers to boot into empty,
      // unauthenticated Temp profiles instead of the real user profile.
      // Explicitly passing --user-data-dir overrides this and forces Chromium to use the real profile on disk!
      // (Note: Do not pass --user-data-dir for Chrome and Edge when they are running with background tasks,
      // to avoid exit code 21 profile lock contention).
      if (
        profile.browserId === "brave" ||
        profile.browserId === "vivaldi" ||
        profile.browserId === "arc" ||
        profile.browserId === "opera" ||
        profile.isCustom
      ) {
        let udd = profile.userDataDir;
        if (!udd && process.platform === "win32") {
          const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
          const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
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

      if (profile.profileDirectory && profile.profileDirectory !== "default-no-arg") {
        args.push(`--profile-directory=${profile.profileDirectory}`);
      }

      if (targetUrl) {
        args.push(targetUrl);
      }
    }

    // Direct process spawn using Node standard libuv command line formatting.
    // NOTE: Never use windowsVerbatimArguments: true on Windows!
    // With standard spawn, Node automatically quotes executable paths and arguments with spaces safely,
    // preventing Chrome and Edge from opening bogus http://files/... or [(x86)] tabs.
    const child = spawn(profile.executablePath, args, {
      detached: true,
      stdio: "ignore",
      cwd: fs.existsSync(exeDir) ? exeDir : undefined,
      env: process.env,
    });

    child.on("error", async (err) => {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to launch browser",
        message: err.message,
      });
    });

    child.unref();

    const modeText = incognito ? " (Incognito)" : "";
    await showToast({
      style: Toast.Style.Success,
      title: `Opened in ${profile.displayName}${modeText}`,
      message: targetUrl ? (targetUrl.length > 50 ? targetUrl.substring(0, 47) + "..." : targetUrl) : undefined,
    });

    await closeMainWindow();
    return true;
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
