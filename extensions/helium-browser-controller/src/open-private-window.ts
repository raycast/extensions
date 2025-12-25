import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

// Get LocalAppData path using multiple methods
function getLocalAppDataPaths(): string[] {
  const paths: string[] = [];

  if (process.env.LOCALAPPDATA) {
    paths.push(process.env.LOCALAPPDATA);
  }

  if (process.env.USERPROFILE) {
    const candidate = path.join(process.env.USERPROFILE, "AppData", "Local");
    if (!paths.includes(candidate)) paths.push(candidate);
  }

  try {
    const homeDir = os.homedir();
    if (homeDir) {
      const candidate = path.join(homeDir, "AppData", "Local");
      if (!paths.includes(candidate)) paths.push(candidate);
    }
  } catch {
    // Ignore
  }

  return paths;
}

// Get all possible Helium installation paths
function getHeliumPaths(): string[] {
  const paths: string[] = [];
  const localAppDataPaths = getLocalAppDataPaths();

  // Known working path (most reliable)
  const homeDir = os.homedir();
  if (homeDir) {
    paths.push(path.join(homeDir, "AppData", "Local", "imput", "Helium", "Application", "chrome.exe"));
  }

  // Add paths for each LocalAppData location
  for (const localAppData of localAppDataPaths) {
    paths.push(path.join(localAppData, "imput", "Helium", "Application", "chrome.exe"));
    paths.push(path.join(localAppData, "imput", "Helium", "Helium.exe"));
    paths.push(path.join(localAppData, "Programs", "Helium", "Helium.exe"));
    paths.push(path.join(localAppData, "Helium", "Helium.exe"));
  }

  // Program Files locations
  if (process.env.PROGRAMFILES) {
    paths.push(path.join(process.env.PROGRAMFILES, "Helium", "Helium.exe"));
  }
  if (process.env["PROGRAMFILES(X86)"]) {
    paths.push(path.join(process.env["PROGRAMFILES(X86)"], "Helium", "Helium.exe"));
  }

  return paths;
}

// Find Helium executable
async function findHeliumPath(): Promise<string | null> {
  // Check known paths first
  for (const p of getHeliumPaths()) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Try Windows registry
  try {
    const { stdout } = await execAsync(
      `powershell -Command "Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\Helium.exe' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty '(default)'"`,
    );
    const registryPath = stdout.trim();
    if (registryPath && fs.existsSync(registryPath)) {
      return registryPath;
    }
  } catch {
    // Ignore
  }

  // Try where command
  try {
    const { stdout } = await execAsync(`where Helium.exe`);
    const wherePath = stdout.trim().split("\n")[0];
    if (wherePath && fs.existsSync(wherePath)) {
      return wherePath;
    }
  } catch {
    // Ignore
  }

  return null;
}

// Launch private window
async function launchPrivateWindow(heliumPath: string): Promise<boolean> {
  const flags = ["--incognito", "--private-window", "--inprivate", "-private"];
  const escapedPath = heliumPath.replace(/'/g, "''").replace(/"/g, '\\"');

  // Try PowerShell Start-Process with different flags
  for (const flag of flags) {
    try {
      await execAsync(
        `powershell -Command "Start-Process -FilePath '${escapedPath}' -ArgumentList '${flag}' -ErrorAction Stop"`,
      );
      return true;
    } catch {
      // Continue to next flag
    }
  }

  // Fallback: cmd start
  try {
    await execAsync(`cmd /c start "" "${heliumPath}" --incognito`);
    return true;
  } catch {
    // Ignore
  }

  return false;
}

export default async function main() {
  try {
    const heliumPath = await findHeliumPath();

    if (!heliumPath || !fs.existsSync(heliumPath)) {
      await showHUD("Helium browser not found. Please check installation.");
      return;
    }

    const success = await launchPrivateWindow(heliumPath);
    await showHUD(success ? "Private window opened" : "Failed to open private window");
  } catch (error) {
    await showHUD("Failed to open private window");
    console.error("Error:", error);
  }
}
