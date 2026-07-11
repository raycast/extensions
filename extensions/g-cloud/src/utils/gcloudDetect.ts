/**
 * gcloud SDK Path Detection Utility
 * Cross-platform support for macOS and Windows
 */

import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import os from "os";

const execPromise = promisify(exec);

export type Platform = "macos" | "windows" | "linux";

// Common installation paths by platform
const MACOS_PATHS = [
  "/opt/homebrew/bin/gcloud", // Apple Silicon Homebrew
  "/usr/local/bin/gcloud", // Intel Homebrew
  "/usr/local/google-cloud-sdk/bin/gcloud",
  `${os.homedir()}/google-cloud-sdk/bin/gcloud`,
  "/usr/bin/gcloud",
];

// Build Windows paths, filtering out any with empty env vars
const WINDOWS_PATHS = [
  // Standard installer locations
  "C:\\Program Files\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd",
  "C:\\Program Files (x86)\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd",
  // User-specific locations using environment variables
  process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd` : null,
  process.env.APPDATA ? `${process.env.APPDATA}\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd` : null,
  // Fallback using homedir
  `${os.homedir()}\\AppData\\Local\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd`,
  // Scoop installation (popular Windows package manager)
  `${os.homedir()}\\scoop\\apps\\gcloud\\current\\google-cloud-sdk\\bin\\gcloud.cmd`,
  // Chocolatey installation
  "C:\\ProgramData\\chocolatey\\lib\\gcloudsdk\\tools\\google-cloud-sdk\\bin\\gcloud.cmd",
].filter((p): p is string => p !== null);

const LINUX_PATHS = [
  "/usr/bin/gcloud",
  "/usr/local/bin/gcloud",
  "/snap/bin/gcloud",
  `${os.homedir()}/google-cloud-sdk/bin/gcloud`,
];

/**
 * Get the current platform
 */
export function getPlatform(): Platform {
  switch (process.platform) {
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    default:
      return "linux";
  }
}

/**
 * Get the gcloud executable name for the current platform
 */
export function getGcloudExecutable(): string {
  return getPlatform() === "windows" ? "gcloud.cmd" : "gcloud";
}

/**
 * Get candidate paths for gcloud installation
 */
export function getCandidatePaths(): string[] {
  const platform = getPlatform();
  switch (platform) {
    case "macos":
      return MACOS_PATHS;
    case "windows":
      return WINDOWS_PATHS;
    case "linux":
      return LINUX_PATHS;
  }
}

/**
 * Validate that a gcloud path is working
 */
export async function validateGcloudPath(path: string): Promise<boolean> {
  try {
    // Quote the path for spaces
    const quotedPath = path.includes(" ") ? `"${path}"` : path;
    await execPromise(`${quotedPath} --version`, { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Try to find gcloud using system commands (which/where)
 */
async function findGcloudInPath(): Promise<string | null> {
  const platform = getPlatform();
  const findCmd = platform === "windows" ? "where" : "which";
  const executable = getGcloudExecutable();

  try {
    const { stdout } = await execPromise(`${findCmd} ${executable}`, { timeout: 5000 });
    // Handle Windows \r\n line endings
    const path = stdout.trim().split(/\r?\n/)[0];
    if (path && (await validateGcloudPath(path))) {
      return path;
    }
  } catch {
    // Command failed, gcloud not in PATH
  }

  // On Windows, also try without .cmd extension as fallback
  if (platform === "windows") {
    try {
      const { stdout } = await execPromise(`${findCmd} gcloud`, { timeout: 5000 });
      const path = stdout.trim().split(/\r?\n/)[0];
      if (path && (await validateGcloudPath(path))) {
        return path;
      }
    } catch {
      // Command failed
    }
  }

  return null;
}

/**
 * Detect gcloud SDK path automatically
 * Returns the path if found, null otherwise
 */
export async function detectGcloudPath(): Promise<string | null> {
  // First, try system PATH
  const pathResult = await findGcloudInPath();
  if (pathResult) {
    return pathResult;
  }

  // Then check common installation paths
  const candidates = getCandidatePaths();
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      if (await validateGcloudPath(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * Get gcloud version info
 */
export async function getGcloudVersion(gcloudPath: string): Promise<string | null> {
  try {
    const quotedPath = gcloudPath.includes(" ") ? `"${gcloudPath}"` : gcloudPath;
    const { stdout } = await execPromise(`${quotedPath} --version`, { timeout: 10000 });
    // Extract first line which contains version
    const firstLine = stdout.trim().split("\n")[0];
    return firstLine || null;
  } catch {
    return null;
  }
}

/**
 * Get the authenticated account
 */
export async function getAuthenticatedAccount(gcloudPath: string): Promise<string | null> {
  try {
    const quotedPath = gcloudPath.includes(" ") ? `"${gcloudPath}"` : gcloudPath;
    const { stdout } = await execPromise(`${quotedPath} auth list --format="value(account)" --filter="status=ACTIVE"`, {
      timeout: 10000,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Get the default project
 */
export async function getDefaultProject(gcloudPath: string): Promise<string | null> {
  try {
    const quotedPath = gcloudPath.includes(" ") ? `"${gcloudPath}"` : gcloudPath;
    const { stdout } = await execPromise(`${quotedPath} config get-value project`, { timeout: 10000 });
    const project = stdout.trim();
    return project && project !== "(unset)" ? project : null;
  } catch {
    return null;
  }
}

/**
 * Get platform-specific installation instructions
 */
export function getInstallInstructions(): { title: string; url: string; command?: string } {
  const platform = getPlatform();

  switch (platform) {
    case "macos":
      return {
        title: "Install via Homebrew",
        command: "brew install google-cloud-sdk",
        url: "https://cloud.google.com/sdk/docs/install#mac",
      };
    case "windows":
      return {
        title: "Download Google Cloud SDK Installer",
        url: "https://cloud.google.com/sdk/docs/install#windows",
      };
    case "linux":
      return {
        title: "Install Google Cloud SDK",
        command: "curl https://sdk.cloud.google.com | bash",
        url: "https://cloud.google.com/sdk/docs/install#linux",
      };
  }
}

export interface DiagnosticResult {
  platform: Platform;
  gcloudPath: string | null;
  gcloudVersion: string | null;
  isValid: boolean;
  authenticatedAccount: string | null;
  defaultProject: string | null;
  searchedPaths: string[];
  installInstructions: { title: string; url: string; command?: string };
}

/**
 * Run full diagnostics
 */
export async function runDiagnostics(configuredPath?: string): Promise<DiagnosticResult> {
  const platform = getPlatform();
  const searchedPaths = getCandidatePaths();
  const installInstructions = getInstallInstructions();

  // Try configured path first, then auto-detect
  let gcloudPath: string | null = null;
  let isValid = false;

  if (configuredPath) {
    isValid = await validateGcloudPath(configuredPath);
    if (isValid) {
      gcloudPath = configuredPath;
    }
  }

  if (!gcloudPath) {
    gcloudPath = await detectGcloudPath();
    isValid = gcloudPath !== null;
  }

  let gcloudVersion: string | null = null;
  let authenticatedAccount: string | null = null;
  let defaultProject: string | null = null;

  if (gcloudPath && isValid) {
    [gcloudVersion, authenticatedAccount, defaultProject] = await Promise.all([
      getGcloudVersion(gcloudPath),
      getAuthenticatedAccount(gcloudPath),
      getDefaultProject(gcloudPath),
    ]);
  }

  return {
    platform,
    gcloudPath,
    gcloudVersion,
    isValid,
    authenticatedAccount,
    defaultProject,
    searchedPaths,
    installInstructions,
  };
}
