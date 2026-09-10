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

      // Edge has Windows Startup Boost background processes that hold an exclusive lock
      // on its User Data directory. Passing --user-data-dir causes Edge to hang or fail.
      // For Chrome, Brave, Vivaldi, Arc, Opera, and custom profiles, passing --user-data-dir
      // is essential to prevent Raycast's desktop sandbox from virtualizing the profile.
      if (profile.browserId !== "edge") {
        let udd = profile.userDataDir;
        if (!udd && process.platform === "win32") {
          const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
          const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
          if (profile.browserId === "chrome") {
            udd = path.join(localAppData, "Google", "Chrome", "User Data");
          } else if (profile.browserId === "brave") {
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

    const child = spawn(profile.executablePath, args, {
      detached: true,
      stdio: "ignore",
      cwd: fs.existsSync(exeDir) ? exeDir : undefined,
      env: process.env,
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
