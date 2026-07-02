import { showToast, Toast } from "@raycast/api";
import { execFileSync } from "child_process";
import net from "net";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { checkProxymanAppInstallation } from "./utils";

const PROXYMAN_APP_PATH = "/Applications/Proxyman.app";
const PROXYMAN_CLI = path.join(PROXYMAN_APP_PATH, "Contents/MacOS/proxyman-cli");
const PROXYMAN_FRAMEWORK_RESOURCES = path.join(
  PROXYMAN_APP_PATH,
  "Contents/Frameworks/ProxymanCore.framework/Versions/A/Resources",
);
const PROXYMAN_APP_SUPPORT_DIR = path.join(homedir(), "Library/Application Support/com.proxyman.NSProxy/app-data");
const PROXYMAN_CERT_PATH = path.join(PROXYMAN_APP_SUPPORT_DIR, "proxyman-ca.pem");
const PROXYMAN_ENV_SCRIPT_PATH = path.join(PROXYMAN_APP_SUPPORT_DIR, "proxyman_env_automatic_setup.sh");
const PROXY_HOST = "127.0.0.1";
const DEFAULT_PROXY_PORT = 9090;
const PROXYMAN_BUNDLE_IDS = ["com.proxyman.NSProxy", "com.proxyman.NSProxy-setapp"];
const PROXY_READY_TIMEOUT_MS = 15000;
const PROXY_POLL_INTERVAL_MS = 500;

function getScriptPath(scriptName: string): string {
  return path.join(PROXYMAN_FRAMEWORK_RESOURCES, scriptName);
}

function isValidPort(port: unknown): port is number {
  return typeof port === "number" && Number.isInteger(port) && port >= 1 && port <= 65535;
}

// Detect the proxy port Proxyman is actually configured to use, so custom ports work
// without any user configuration. The official CLI reports it as JSON even when Proxyman
// is not running; the auto-generated env script is a reliable fallback.
function getProxymanPort(): number {
  try {
    const out = execFileSync(PROXYMAN_CLI, ["proxy-host"], { encoding: "utf-8" });
    const port = JSON.parse(out).port;
    if (isValidPort(port)) {
      return port;
    }
  } catch {
    // CLI missing or failed — fall through to the env script
  }

  try {
    const script = readFileSync(PROXYMAN_ENV_SCRIPT_PATH, "utf-8");
    const match = script.match(/127\.0\.0\.1:(\d+)/);
    if (match) {
      const port = Number.parseInt(match[1], 10);
      if (isValidPort(port)) {
        return port;
      }
    }
  } catch {
    // Env script missing — fall through to the default
  }

  return DEFAULT_PROXY_PORT;
}

function getProxyServer(port: number): string {
  return `http://${PROXY_HOST}:${port}`;
}

function quitApp(appName: string): void {
  try {
    execFileSync("osascript", ["-e", `tell application "${appName}" to quit`], { encoding: "utf-8" });
  } catch {
    // App may not be running or may not respond to quit
  }
}

function isAppRunning(processName: string): boolean {
  try {
    const result = execFileSync("pgrep", ["-x", processName], { encoding: "utf-8" });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Check whether the proxy port is accepting connections (i.e. Proxyman's proxy is live).
// A live TCP connection is more reliable than a process check: Proxyman may be running
// while its proxy is still starting up and not yet listening.
function isProxyListening(port: number, timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: PROXY_HOST, port });
    const done = (result: boolean) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

function launchProxyman(): void {
  for (const bundleId of PROXYMAN_BUNDLE_IDS) {
    try {
      execFileSync("open", ["-b", bundleId], { encoding: "utf-8" });
      return;
    } catch {
      // Try the next bundle id (e.g. Setapp variant)
    }
  }
}

// Ensure Proxyman is running and its proxy is accepting connections before configuring
// a browser or terminal. Without this, a configured browser points to a dead proxy and
// cannot load any page.
async function ensureProxymanRunning(port: number): Promise<boolean> {
  if (await isProxyListening(port)) {
    return true;
  }

  await showToast({ style: Toast.Style.Animated, title: "Starting Proxyman..." });
  launchProxyman();

  const deadline = Date.now() + PROXY_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await waitMs(PROXY_POLL_INTERVAL_MS);
    if (await isProxyListening(port)) {
      return true;
    }
  }
  return false;
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

export async function setupChromeCurrentProfile(): Promise<void> {
  try {
    const isInstalled = await checkProxymanAppInstallation();
    if (!isInstalled) return;

    const scriptPath = getScriptPath("inject_google_chrome.sh");
    const error = checkPrerequisites(scriptPath);
    if (error) {
      await showToast({ style: Toast.Style.Failure, title: "Setup Failed", message: error });
      return;
    }

    const port = getProxymanPort();
    const ready = await ensureProxymanRunning(port);
    if (!ready) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Proxyman Proxy Not Available",
        message: `Proxyman is not listening on port ${port}. Open Proxyman and enable the proxy.`,
      });
      return;
    }

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

    execFileSync("bash", [scriptPath, "-c", PROXYMAN_CERT_PATH, "-p", getProxyServer(port)], {
      encoding: "utf-8",
      timeout: 10000,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Google Chrome Launched with Proxyman Proxy",
      message: `Current profile, proxy on ${PROXY_HOST}:${port}`,
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
    const isInstalled = await checkProxymanAppInstallation();
    if (!isInstalled) return;

    const scriptPath = getScriptPath("inject_google_chrome.sh");
    const error = checkPrerequisites(scriptPath);
    if (error) {
      await showToast({ style: Toast.Style.Failure, title: "Setup Failed", message: error });
      return;
    }

    const port = getProxymanPort();
    const ready = await ensureProxymanRunning(port);
    if (!ready) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Proxyman Proxy Not Available",
        message: `Proxyman is not listening on port ${port}. Open Proxyman and enable the proxy.`,
      });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Launching Google Chrome with New Profile..." });

    execFileSync("bash", [scriptPath, "-c", PROXYMAN_CERT_PATH, "-p", getProxyServer(port), "-n"], {
      encoding: "utf-8",
      timeout: 10000,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Google Chrome Launched with New Profile",
      message: `Temporary profile, proxy on ${PROXY_HOST}:${port}`,
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
    const isInstalled = await checkProxymanAppInstallation();
    if (!isInstalled) return;

    const scriptPath = getScriptPath("inject_firefox.sh");
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

    const port = getProxymanPort();
    const ready = await ensureProxymanRunning(port);
    if (!ready) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Proxyman Proxy Not Available",
        message: `Proxyman is not listening on port ${port}. Open Proxyman and enable the proxy.`,
      });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Launching Firefox with Proxyman..." });

    execFileSync("bash", [scriptPath, "-c", PROXYMAN_CERT_PATH, "-p", getProxyServer(port)], {
      encoding: "utf-8",
      timeout: 15000,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Firefox Launched with Proxyman Proxy",
      message: `Temporary profile, proxy on ${PROXY_HOST}:${port}`,
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

    const port = getProxymanPort();
    const ready = await ensureProxymanRunning(port);
    if (!ready) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Proxyman Proxy Not Available",
        message: `Proxyman is not listening on port ${port}. Open Proxyman and enable the proxy.`,
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
        `do script "source '${PROXYMAN_ENV_SCRIPT_PATH.replace(/'/g, "'\\''")}'"`,
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
