import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { getPreferenceValues } from "@raycast/api";

const execAsync = promisify(exec);

export async function findComposerPath(): Promise<string> {
  const commonPaths = [
    "/opt/homebrew/bin/composer",
    "/usr/local/bin/composer",
    "/usr/bin/composer",
    "/opt/local/bin/composer",
    "composer",
  ];

  try {
    const { stdout } = await execAsync("which composer");
    const composerPath = stdout.trim();
    if (composerPath && existsSync(composerPath)) {
      return composerPath;
    }
  } catch {
    // ignore
  }

  for (const path of commonPaths) {
    if (path === "composer") {
      try {
        await execAsync("composer --version");
        return "composer";
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

  throw new Error(
    "Composer not found. Please install Composer or ensure it's in your PATH."
  );
}

let cachedComposerPath: string | null = null;

export async function getComposerPath(): Promise<string> {
  if (!cachedComposerPath) {
    const { composerPath } = getPreferenceValues<{ composerPath?: string }>();
    if (composerPath && composerPath.trim()) {
      try {
        await execAsync(`${composerPath} --version`);
        cachedComposerPath = composerPath.trim();
      } catch {
        console.warn(
          "Configured composerPath is invalid, falling back to detection."
        );
      }
    }

    if (!cachedComposerPath) {
      cachedComposerPath = await findComposerPath();
    }
  }
  return cachedComposerPath;
}
