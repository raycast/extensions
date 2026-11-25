import { execFile } from "node:child_process";
import fs from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function isMediaEncoderInstalled(): boolean {
  try {
    if (process.platform === "darwin" && fs.existsSync("/Applications")) {
      const apps = fs.readdirSync("/Applications");
      return apps.some((app) => app.toLowerCase().includes("adobe media encoder"));
    }
  } catch {
    // Graceful fallback
  }
  return false;
}

export async function openInPremierePro(filePath: string): Promise<void> {
  if (process.platform === "darwin") {
    await execFileAsync("open", ["-a", "Adobe Premiere Pro", filePath]);
  }
}

export async function openInMediaEncoder(filePath: string): Promise<void> {
  if (process.platform === "darwin") {
    await execFileAsync("open", ["-a", "Adobe Media Encoder", filePath]);
  }
}
