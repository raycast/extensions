import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFileSync } from "child_process";
import net from "net";
import { existsSync, readFileSync, readlinkSync } from "fs";
import { homedir } from "os";
import path from "path";
import { checkProxymanAppInstallation, getProxymanAppPath } from "./utils";

const PROXY_HOST = "127.0.0.1";
const DEFAULT_PROXY_PORT = 9090;
const PROXYMAN_BUNDLE_IDS = ["com.proxyman.NSProxy", "com.proxyman.NSProxy-setapp"];
const PROXY_READY_TIMEOUT_MS = 15000;
const CHROME_PROCESS_NAME = "Google Chrome";
const CHROME_DEFAULT_DATA_DIR = path.join(homedir(), "Library/Application Support/Google/Chrome");
const CHROME_QUIT_TIMEOUT_MS = 15000;
const CHROME_LAUNCH_TIMEOUT_MS = 10000;
const PROXY_POLL_INTERVAL_MS = 500;

interface ProxymanPaths {
  cli: string;
  frameworkResources: string;
  cert: string;
  envScript: string;
}

// Resolve every filesystem path from the actual install location of Proxyman. It is not always
// /Applications/Proxyman.app — Setapp installs it under /Applications/Setapp/Proxyman.app, so
// hardcoding the bundle path would break all Setup commands for Setapp users.
function resolveProxymanPaths(appPath: string): ProxymanPaths {
  const appDataDir = resolveAppDataDir();
  return {
    cli: path.join(appPath, "Contents/MacOS/proxyman-cli"),
    frameworkResources: path.join(appPath, "Contents/Frameworks/ProxymanCore.framework/Versions/A/Resources"),
    cert: path.join(appDataDir, "proxyman-ca.pem"),
    envScript: path.join(appDataDir, "proxyman_env_automatic_setup.sh"),
  };
}

// The app-data directory lives under Application Support keyed by bundle id; the Setapp build
// uses a different id, so pick whichever exists.
function resolveAppDataDir(): string {
  const base = path.join(homedir(), "Library/Application Support");
  const candidates = [
    path.join(base, "com.proxyman.NSProxy/app-data"),
    path.join(base, "com.proxyman.NSProxy-setapp/app-data"),
  ];
  return candidates.find((dir) => existsSync(dir)) ?? candidates[0];
}

function getScriptPath(paths: ProxymanPaths, scriptName: string): string {
  return path.join(paths.frameworkResources, scriptName);
}

function isValidPort(port: unknown): port is number {
  return typeof port === "number" && Number.isInteger(port) && port >= 1 && port <= 65535;
}

// Detect the proxy port Proxyman is actually configured to use, so custom ports work
// without any user configuration. The official CLI reports it as JSON even when Proxyman
// is not running; the auto-generated env script is a reliable fallback.
function getProxymanPort(paths: ProxymanPaths): number {
  try {
    const out = execFileSync(paths.cli, ["proxy-host"], { encoding: "utf-8" });
    const port = JSON.parse(out).port;
    if (isValidPort(port)) {
      return port;
    }
  } catch {
    // CLI missing or failed — fall through to the env script
  }

  try {
    const script = readFileSync(paths.envScript, "utf-8");
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

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getChromeMainPids(): number[] {
  try {
    return execFileSync("pgrep", ["-x", CHROME_PROCESS_NAME], { encoding: "utf-8" })
      .split("\n")
      .map((line) => Number.parseInt(line, 10))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

function getProcessCommand(pid: number): string {
  try {
    return execFileSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

// Chrome's ProcessSingleton marks the owner of a user data dir with a `SingletonLock` symlink
// pointing to "<hostname>-<pid>". Reading it identifies the instance holding the user's real
// profiles without parsing `ps` output, which joins arguments with spaces and cannot tell where
// a path containing spaces ends. Instances on other dirs (e.g. the /tmp/chrome-insecure one that
// "New Profile" launches) are never matched.
function getDefaultProfileChromePid(): number | undefined {
  try {
    const target = readlinkSync(path.join(CHROME_DEFAULT_DATA_DIR, "SingletonLock"));
    const pid = Number.parseInt(target.slice(target.lastIndexOf("-") + 1), 10);
    if (!getChromeMainPids().includes(pid)) {
      return undefined;
    }
    return ownsDefaultChromeSocket(pid) ? pid : undefined;
  } catch {
    return undefined;
  }
}

// A lock left behind by a crash can point to a PID that was later reused by another process,
// even another Chrome on a different data dir. The owner also listens on the Unix socket that
// `SingletonSocket` links to (a per-instance temporary path), so require the process to have
// exactly that socket open.
function ownsDefaultChromeSocket(pid: number): boolean {
  try {
    const socketPath = readlinkSync(path.join(CHROME_DEFAULT_DATA_DIR, "SingletonSocket"));
    const output = execFileSync("/usr/sbin/lsof", ["-a", "-p", String(pid), "-U", "-Fn"], { encoding: "utf-8" });
    return output.split("\n").includes(`n${socketPath}`);
  } catch {
    return false;
  }
}

// Send a regular Quit (same as ⌘Q) to one specific process. AppleScript's
// `tell application "Google Chrome" to quit` cannot be used: with several Chrome instances
// running it only reaches one of them, often not the one holding the user's profile.
async function requestQuit(pid: number): Promise<void> {
  try {
    await runAppleScript(
      'function run(argv) { ObjC.import("AppKit"); const app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(Number(argv[0])); if (!app.isNil()) { app.terminate; } }',
      [String(pid)],
      { language: "JavaScript", timeout: 5000 },
    );
  } catch {
    // Process may already be gone; the caller polls for the actual exit
  }
}

// Chrome applies command-line flags only when it starts a fresh process for a user data dir:
// launching while an instance already owns that dir just forwards the request to it and the
// proxy flags are silently dropped. So the instance owning the default dir must be fully
// gone before relaunching.
async function quitDefaultProfileChrome(): Promise<boolean> {
  const pid = getDefaultProfileChromePid();
  if (pid === undefined) {
    return true;
  }
  await requestQuit(pid);

  const deadline = Date.now() + CHROME_QUIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await waitMs(PROXY_POLL_INTERVAL_MS);
    if (!getChromeMainPids().includes(pid)) {
      return true;
    }
  }
  return false;
}

// Confirm that a Chrome instance on the default user data dir is actually running with our
// proxy flag, instead of assuming the launch worked.
async function waitForProxiedDefaultProfileChrome(proxyServer: string): Promise<boolean> {
  const deadline = Date.now() + CHROME_LAUNCH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await waitMs(PROXY_POLL_INTERVAL_MS);
    const pid = getDefaultProfileChromePid();
    const proxied = pid !== undefined && getProcessCommand(pid).split(/\s+/).includes(`--proxy-server=${proxyServer}`);
    if (proxied) {
      return true;
    }
  }
  return false;
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

function checkPrerequisites(paths: ProxymanPaths, scriptPath: string): string | null {
  if (!existsSync(scriptPath)) {
    return "Injection script not found. Update Proxyman to v5.10.0 or later.";
  }
  if (!existsSync(paths.cert)) {
    return "Proxyman certificate not found. Open Proxyman and complete the initial setup first.";
  }
  return null;
}

async function initProxymanPaths(): Promise<ProxymanPaths | null> {
  const isInstalled = await checkProxymanAppInstallation();
  if (!isInstalled) return null;

  const appPath = await getProxymanAppPath();
  if (!appPath) return null;

  return resolveProxymanPaths(appPath);
}

async function validateScriptSetup(paths: ProxymanPaths, scriptName: string): Promise<string | null> {
  const scriptPath = getScriptPath(paths, scriptName);
  const error = checkPrerequisites(paths, scriptPath);
  if (error) {
    await showToast({ style: Toast.Style.Failure, title: "Setup Failed", message: error });
    return null;
  }
  return scriptPath;
}

async function getReadyPort(paths: ProxymanPaths): Promise<number | null> {
  const port = getProxymanPort(paths);
  const ready = await ensureProxymanRunning(port);
  if (!ready) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Proxyman Proxy Not Available",
      message: `Proxyman is not listening on port ${port}. Open Proxyman and enable the proxy.`,
    });
    return null;
  }
  return port;
}

async function setupChrome(newProfile: boolean): Promise<void> {
  try {
    const paths = await initProxymanPaths();
    if (!paths) return;

    const scriptPath = await validateScriptSetup(paths, "inject_google_chrome.sh");
    if (!scriptPath) return;

    const port = await getReadyPort(paths);
    if (port === null) return;

    if (!newProfile && getDefaultProfileChromePid() !== undefined) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Closing Google Chrome...",
        message: "Chrome must restart to apply proxy settings",
      });
      const closed = await quitDefaultProfileChrome();
      if (!closed) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Google Chrome Did Not Quit",
          message: "Close any open dialogs in Chrome, quit it, and run the command again.",
        });
        return;
      }
    }

    const launchTitle = newProfile
      ? "Launching Google Chrome with New Profile..."
      : "Launching Google Chrome with Proxyman...";
    await showToast({ style: Toast.Style.Animated, title: launchTitle });

    const proxyServer = getProxyServer(port);
    const bashArgs = [scriptPath, "-c", paths.cert, "-p", proxyServer];
    if (newProfile) bashArgs.push("-n");
    execFileSync("bash", bashArgs, { encoding: "utf-8", timeout: 10000 });

    if (!newProfile && !(await waitForProxiedDefaultProfileChrome(proxyServer))) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Chrome Started Without Proxyman Proxy",
        message: "Quit Google Chrome completely and run the command again.",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Success,
      title: newProfile ? "Google Chrome Launched with New Profile" : "Google Chrome Launched with Proxyman Proxy",
      message: newProfile
        ? `Temporary profile, proxy on ${PROXY_HOST}:${port}`
        : `Current profile, proxy on ${PROXY_HOST}:${port}`,
    });
  } catch (error) {
    console.error(
      newProfile ? "Error setting up Chrome (New Profile)" : "Error setting up Chrome (Current Profile)",
      error,
    );
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Launch Chrome",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}

export async function setupChromeCurrentProfile(): Promise<void> {
  return setupChrome(false);
}

export async function setupChromeNewProfile(): Promise<void> {
  return setupChrome(true);
}

export async function setupFirefox(): Promise<void> {
  try {
    const paths = await initProxymanPaths();
    if (!paths) return;

    const scriptPath = await validateScriptSetup(paths, "inject_firefox.sh");
    if (!scriptPath) return;

    // Check if certutil is available (required by the Firefox injection script)
    const certutilPaths = ["/opt/homebrew/bin/certutil", "/usr/local/opt/nss/bin/certutil"];
    let certutilFound = certutilPaths.some((p) => existsSync(p));
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

    const port = await getReadyPort(paths);
    if (port === null) return;

    await showToast({ style: Toast.Style.Animated, title: "Launching Firefox with Proxyman..." });

    execFileSync("bash", [scriptPath, "-c", paths.cert, "-p", getProxyServer(port)], {
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
    const paths = await initProxymanPaths();
    if (!paths) return;

    if (!existsSync(paths.envScript)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Setup Failed",
        message: "Proxyman environment script not found. Open Proxyman and complete the initial setup first.",
      });
      return;
    }

    const port = await getReadyPort(paths);
    if (port === null) return;

    await showToast({ style: Toast.Style.Animated, title: "Opening Terminal with Proxyman..." });

    execFileSync(
      "osascript",
      [
        "-e",
        'tell application "Terminal"',
        "-e",
        "activate",
        "-e",
        `do script "source '${paths.envScript.replace(/'/g, "'\\''")}'"`,
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
