import { showHUD, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

type Preferences = {
  heliumPath?: string;
};

function existsFile(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function getHeliumCandidatePaths(): string[] {
  const candidates: string[] = [];
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const programFiles = process.env.PROGRAMFILES || "C:\\Program Files";
  const programFilesX86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";

  candidates.push(
    path.join(localAppData, "imput", "Helium", "Application", "chrome.exe"),
    path.join(localAppData, "imput", "Helium", "Helium.exe"),
    path.join(localAppData, "Programs", "Helium", "Helium.exe"),
    path.join(localAppData, "Helium", "Helium.exe"),
    path.join(programFiles, "Helium", "Helium.exe"),
    path.join(programFilesX86, "Helium", "Helium.exe"),
  );

  return candidates;
}

async function findHeliumPath(): Promise<string | null> {
  const prefs = getPreferenceValues<Preferences>();
  if (prefs.heliumPath && existsFile(prefs.heliumPath)) {
    return prefs.heliumPath;
  }

  for (const p of getHeliumCandidatePaths()) {
    if (existsFile(p)) return p;
  }

  return null;
}

export default async function main() {
  try {
    const heliumPath = await findHeliumPath();

    if (!heliumPath) {
      await showHUD("❌ Helium not found — set path in preferences");
      return;
    }

    // Use cmd.exe to launch the browser (more reliable on Windows)
    await execAsync(`start "" "${heliumPath}"`);
    await showHUD("✅ Helium opened");
  } catch (e) {
    console.error("Error launching Helium:", e);
    await showHUD("❌ Failed to open Helium");
  }
}
