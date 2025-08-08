import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { getPreferenceValues } from "@raycast/api";

const execAsync = promisify(exec);

export async function findPhpPath(): Promise<string> {
  // Common PHP paths to check
  const commonPaths = [
    "/opt/homebrew/bin/php", // Homebrew on Apple Silicon
    "/usr/local/bin/php",    // Homebrew on Intel
    "/usr/bin/php",          // System PHP
    "/opt/local/bin/php",    // MacPorts
    "php"                    // Hope it's in PATH
  ];

  // First try to find PHP using 'which'
  try {
    const { stdout } = await execAsync("which php");
    const phpPath = stdout.trim();
    if (phpPath && existsSync(phpPath)) {
      return phpPath;
    }
  } catch {
    // 'which' failed, continue with manual search
  }

  // Check common paths
  for (const path of commonPaths) {
    if (path === "php") {
      // Test if php is in PATH
      try {
        await execAsync("php --version");
        return "php";
      } catch {
        continue;
      }
    } else if (existsSync(path)) {
      try {
        await execAsync(`${path} --version`);
        return path;
      } catch {
        continue;
      }
    }
  }

  throw new Error("PHP not found. Please install PHP or ensure it's in your PATH.");
}

let cachedPhpPath: string | null = null;

export async function getPhpPath(): Promise<string> {
  if (!cachedPhpPath) {
    const { phpPath } = getPreferenceValues<{ phpPath?: string }>();
    if (phpPath && phpPath.trim()) {
      try {
        await execAsync(`${phpPath} --version`);
        cachedPhpPath = phpPath.trim();
      } catch {
        console.warn("Configured phpPath is invalid, falling back to detection.");
      }
    }

    if (!cachedPhpPath) {
      cachedPhpPath = await findPhpPath();
    }
  }
  return cachedPhpPath;
}
