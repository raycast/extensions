import { showToast, Toast } from "@raycast/api";
import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import path from "path";
import { checkProxymanAppInstallation } from "./utils";

const PROXYMAN_APP_SUPPORT_DIR = path.join(homedir(), "Library/Application Support/com.proxyman.NSProxy/app-data");
const PROXYMAN_CERT_PATH = path.join(PROXYMAN_APP_SUPPORT_DIR, "proxyman-ca.pem");
const PROXYMAN_ENV_SCRIPT_PATH = path.join(PROXYMAN_APP_SUPPORT_DIR, "proxyman_env_automatic_setup.sh");
const DEFAULT_PROXY_SERVER = "http://127.0.0.1:9090";

function getScriptPath(appPath: string, scriptName: string): string {
  return path.join(appPath, "Contents/Frameworks/ProxymanCore.framework/Versions/A/Resources", scriptName);
}

function isAppRunning(processName: string): boolean {
  try {
    const result = execFileSync("pgrep", ["-x", processName], { encoding: "utf-8" });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

function quitApp(appName: string): void {
  try {
    execFileSync("osascript", ["-e", `tell application "${appName}" to quit`], { encoding: "utf-8" });
  } catch {
    // App may not be running or may not respond to quit
  }
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkPrerequisites(scriptPath: string): string | null {
  if (!existsSync(scriptPath)) {
    return "Injection script not found. Update Proxyman to v5.10.0 or later.";
  }
  if (!existsSync(PROXYMAN_CERT_PATH)) {
    return "Proxyman certificate not found. Open Proxyman and complete the initial setup first.";
  }
  return null;
}

async function prepareChromeSetup(): Promise<string | null> {
  const appPath = await checkProxymanAppInstallation();
  if (!appPath) return null;

  const scriptPath = getScriptPath(appPath, "inject_google_chrome.sh");
  const error = checkPrerequisites(scriptPath);
  if (error) {
    await showToast({ style: Toast.Style.Failure, title: "Setup Failed", message: error });
    return null;
  }

  return scriptPath;
}

export async function setupChromeCurrentProfile(): Promise<void> {
  try {
    const scriptPath = await prepareChromeSetup();
    if (!scriptPath) return;

    if (isAppRunning("Google Chrome")) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Closing Google Chrome...",
        message: "Chrome must restart to apply proxy settings",
      });
      quitApp("Google Chrome");
      await waitMs(1500);
    }

    await showToast({ style: Toast.Style.Animated, title: "Launching Google Chrome with Proxyman..." });

    execFileSync("bash", [scriptPath, "-c", PROXYMAN_CERT_PATH, "-p", DEFAULT_PROXY_SERVER], {
      encoding: "utf-8",
      timeout: 10000,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Google Chrome Launched with Proxyman Proxy",
      message: "Current profile, proxy on 127.0.0.1:9090",
    });
  } catch (error) {
    console.error("Error setting up Chrome (Current Profile)", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Launch Chrome",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}

export async function setupChromeNewProfile(): Promise<void> {
  try {
    const scriptPath = await prepareChromeSetup();
    if (!scriptPath) return;

    await showToast({ style: Toast.Style.Animated, title: "Launching Google Chrome with New Profile..." });

    execFileSync("bash", [scriptPath, "-c", PROXYMAN_CERT_PATH, "-p", DEFAULT_PROXY_SERVER, "-n"], {
      encoding: "utf-8",
      timeout: 10000,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Google Chrome Launched with New Profile",
      message: "Temporary profile, proxy on 127.0.0.1:9090",
    });
  } catch (error) {
    console.error("Error setting up Chrome (New Profile)", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Launch Chrome",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}

export async function setupFirefox(): Promise<void> {
  try {
    const appPath = await checkProxymanAppInstallation();
    if (!appPath) return;

    const scriptPath = getScriptPath(appPath, "inject_firefox.sh");
    const error = checkPrerequisites(scriptPath);
    if (error) {
      await showToast({ style: Toast.Style.Failure, title: "Setup Failed", message: error });
      return;
    }

    // Check if certutil is available (required by the Firefox injection script)
    const certutilPaths = ["/opt/homebrew/bin/certutil", "/usr/local/opt/nss/bin/certutil"];
    let certutilFound = false;
    for (const p of certutilPaths) {
      if (existsSync(p)) {
        certutilFound = true;
        break;
      }
    }
    if (!certutilFound) {
      try {
        execFileSync("which", ["certutil"], { encoding: "utf-8" });
        certutilFound = true;
      } catch {
        // not found in PATH either
      }
    }
    if (!certutilFound) {
      await showToast({
        style: Toast.Style.Failure,
        title: "certutil Not Found",
        message: "Install it with: brew install nss",
      });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Launching Firefox with Proxyman..." });

    execFileSync("bash", [scriptPath, "-c", PROXYMAN_CERT_PATH, "-p", DEFAULT_PROXY_SERVER], {
      encoding: "utf-8",
      timeout: 15000,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Firefox Launched with Proxyman Proxy",
      message: "Temporary profile, proxy on 127.0.0.1:9090",
    });
  } catch (error) {
    console.error("Error setting up Firefox", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Launch Firefox",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}

export async function setupTerminal(): Promise<void> {
  try {
    const isInstalled = await checkProxymanAppInstallation();
    if (!isInstalled) return;

    if (!existsSync(PROXYMAN_ENV_SCRIPT_PATH)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Setup Failed",
        message: "Proxyman environment script not found. Open Proxyman and complete the initial setup first.",
      });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Opening Terminal with Proxyman..." });

    execFileSync(
      "osascript",
      [
        "-e",
        'tell application "Terminal"',
        "-e",
        "activate",
        "-e",
        `do script "source '${PROXYMAN_ENV_SCRIPT_PATH}'"`,
        "-e",
        "end tell",
      ],
      { encoding: "utf-8", timeout: 10000 },
    );

    await showToast({
      style: Toast.Style.Success,
      title: "Terminal Opened with Proxyman Environment",
      message: "Proxy environment variables injected",
    });
  } catch (error) {
    console.error("Error setting up Terminal", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Open Terminal",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}
