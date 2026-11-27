import { open } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";

function findMediaEncoderAppPath(): string | null {
  if (process.platform !== "darwin") return null;
  const applicationsDir = "/Applications";
  try {
    if (!fs.existsSync(applicationsDir)) return null;
    const entries = fs.readdirSync(applicationsDir);
    const encoderFolders = entries
      .filter((entry) => entry.toLowerCase().startsWith("adobe media encoder") && !entry.endsWith(".zip"))
      .sort()
      .reverse();

    for (const folder of encoderFolders) {
      const fullFolder = path.join(applicationsDir, folder);
      if (folder.endsWith(".app")) {
        return fullFolder;
      }
      try {
        if (fs.statSync(fullFolder).isDirectory()) {
          const appBundle = fs.readdirSync(fullFolder).find((item) => item.endsWith(".app"));
          if (appBundle) {
            return path.join(fullFolder, appBundle);
          }
        }
      } catch {
        // Continue checking remaining folders
      }
    }
  } catch {
    // Graceful fallback
  }
  return null;
}

export function isMediaEncoderInstalled(): boolean {
  return findMediaEncoderAppPath() !== null;
}

export async function openInMediaEncoder(filePath: string): Promise<void> {
  if (process.platform !== "darwin") {
    throw new Error("Opening in Adobe Media Encoder is only supported on macOS");
  }
  const appPath = findMediaEncoderAppPath();
  if (!appPath) {
    throw new Error("Adobe Media Encoder is not installed in /Applications");
  }
  await open(filePath, appPath);
}
