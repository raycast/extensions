import { showToast, Toast, open } from "@raycast/api";
import { getApplicationInfo } from "./api";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import { exec as execCb } from "child_process";

const exec = promisify(execCb);

async function isEagleRunning() {
  try {
    await getApplicationInfo();
    return true;
  } catch {
    // fall through to platform-specific checks
  }

  const platform = process.platform || os.platform();

  if (platform === "win32") {
    const programFiles = process.env.PROGRAMFILES || `C:\\Program Files`;
    const programFilesX86 = process.env["PROGRAMFILES(X86)"] || `C:\\Program Files (x86)`;
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");

    const candidates = [
      path.join(programFiles, "Eagle", "Eagle.exe"),
      path.join(programFilesX86, "Eagle", "Eagle.exe"),
      path.join(localAppData, "Programs", "Eagle", "Eagle.exe"),
      path.join(localAppData, "Eagle", "Eagle.exe"),
    ];

    if (candidates.some((p) => existsSync(p))) {
      return true;
    }
  }

  if (platform === "darwin") {
    const candidates = [
      "/Applications/Eagle.app",
      path.join(os.homedir(), "Applications", "Eagle.app"),
      "/Applications/Eagle.app/Contents/MacOS/Eagle",
      path.join(os.homedir(), "Applications", "Eagle.app", "Contents", "MacOS", "Eagle"),
    ];

    if (candidates.some((p) => existsSync(p))) {
      return true;
    }
  }

  if (platform === "win32") {
    try {
      const keys = [
        "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
      ];

      for (const key of keys) {
        try {
          const { stdout } = await exec(`reg query "${key}" /s`);
          if (!stdout) continue;

          const lines = stdout.split(/\r?\n/);
          let currentSection: string[] = [];
          const sections: string[][] = [];

          for (const line of lines) {
            if (/^HKEY_/i.test(line) || /^HKLM|^HKCU|^HKCR|^HKU|^HKCC/i.test(line)) {
              if (currentSection.length) {
                sections.push(currentSection);
              }
              currentSection = [line];
            } else if (line.trim() === "") {
              if (currentSection.length) {
                sections.push(currentSection);
                currentSection = [];
              }
            } else if (currentSection) {
              currentSection.push(line);
            }
          }
          if (currentSection.length) sections.push(currentSection);

          // For each section, look for DisplayName or InstallLocation entries
          for (const sec of sections) {
            for (const entry of sec) {
              const mDisplay = entry.match(/DisplayName\s+REG_\w+\s+(.+)/i);
              if (mDisplay && /eagle/i.test(mDisplay[1])) return true;

              const mInstall = entry.match(/InstallLocation\s+REG_\w+\s+(.+)/i);
              if (mInstall && /eagle/i.test(mInstall[1])) return true;
            }
          }
        } catch {
          // ignore errors per-key and continue
        }
      }
    } catch {
      // ignore overall errors
    }
  }

  try {
    if (platform === "win32") {
      const { stdout } = await exec('tasklist /FI "IMAGENAME eq Eagle.exe" /NH');
      if (stdout && stdout.toLowerCase().includes("eagle.exe")) return true;
    } else if (platform === "darwin") {
      try {
        const { stdout } = await exec("pgrep -x Eagle || true");
        if (stdout && stdout.trim() !== "") return true;
      } catch {
        const { stdout } = await exec("pgrep -f eagle || true");
        if (stdout && stdout.trim() !== "") return true;
      }
    }
  } catch {
    // ignore any errors from process-listing
  }

  return false;
}

export async function checkEagleInstallation() {
  if (!(await isEagleRunning())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Eagle is not running or API is disabled.",
      message: "Make sure Eagle is running and API server is enabled (Settings → Advanced → Enable HTTP API)",
      primaryAction: {
        title: "Go to https://eagle.cool",
        onAction: (toast) => {
          open("https://eagle.cool");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
}
