import { execFile } from "child_process";
import { promisify } from "util";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { AmpUsage, AmpError } from "./types";
import { parseAmpUsage } from "./parser";
import { createSimpleHook } from "../agents/hooks";

const execFileAsync = promisify(execFile);
let cachedAmpPath: string | null = null;

interface ExecFailure extends Error {
  stdout?: string | Buffer;
  stderr?: string | Buffer;
}

async function detectAmpPath(): Promise<string> {
  if (cachedAmpPath) {
    return cachedAmpPath;
  }

  // Try PATH first using 'which' (macOS/Linux) or 'where' (Windows)
  const isWindows = process.platform === "win32";
  const command = isWindows ? "where" : "which";

  try {
    const { stdout } = await execFileAsync(command, ["amp"], { encoding: "utf-8", timeout: 5000 });
    const detectedPath = stdout.trim().split("\n")[0]; // 'where' may return multiple lines
    if (detectedPath && fs.existsSync(detectedPath)) {
      cachedAmpPath = detectedPath;
      return detectedPath;
    }
  } catch {
    // Command failed, try common locations
  }

  // Fallback to common installation paths
  const homeDir = os.homedir();
  const commonPaths = isWindows
    ? [
        path.join(homeDir, ".local", "bin", "amp.exe"),
        path.join(homeDir, "AppData", "Local", "Programs", "amp", "amp.exe"),
      ]
    : [path.join(homeDir, ".local", "bin", "amp"), "/usr/local/bin/amp", "/opt/homebrew/bin/amp"];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      cachedAmpPath = p;
      return p;
    }
  }

  // Last resort: rely on PATH
  cachedAmpPath = "amp";
  return "amp";
}

function getExecFailureMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unknown error";
  }

  const execError = error as ExecFailure;
  const stderr = execError.stderr?.toString().trim();
  const stdout = execError.stdout?.toString().trim();
  return stderr || stdout || execError.message;
}

async function fetchAmpUsage(): Promise<{ usage: AmpUsage | null; error: AmpError | null }> {
  try {
    const ampPath = await detectAmpPath();
    const { stdout } = await execFileAsync(ampPath, ["usage"], { encoding: "utf-8", timeout: 10000 });
    return parseAmpUsage(stdout);
  } catch (error) {
    cachedAmpPath = null;
    return {
      usage: null,
      error: { type: "unknown", message: getExecFailureMessage(error) },
    };
  }
}

export const useAmpUsage = createSimpleHook<AmpUsage, AmpError>({ fetcher: fetchAmpUsage });
