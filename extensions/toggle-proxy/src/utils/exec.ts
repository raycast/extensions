import { execaCommand } from "execa";
import * as fs from "fs";
import * as path from "path";
import { environment } from "@raycast/api";

const DEFAULT_PATH = "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin";
export const ENV_PATH = process.env.PATH ? `${process.env.PATH}:${DEFAULT_PATH}` : DEFAULT_PATH;
// Use environment.supportPath for logs
const logPath = path.join(environment.supportPath, "logs");

// Ensure log directory exists
try {
  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath, { recursive: true });
  }
} catch (error) {
  console.error("Failed to create log directory:", error);
}

// Log function
function logError(message: string, error: unknown) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}: ${JSON.stringify(error)}\n`;

  try {
    fs.appendFileSync(path.join(logPath, "tmux-errors.log"), logMessage);
  } catch (e) {
    console.error("Failed to write to log file:", e);
  }
}

// Check if tmux is installed and get its path
async function getTmuxPath(): Promise<string> {
  try {
    // Try to find tmux in common locations
    const possiblePaths = ["/usr/bin/tmux", "/usr/local/bin/tmux", "/opt/homebrew/bin/tmux"];

    for (const tmuxPath of possiblePaths) {
      try {
        if (fs.existsSync(tmuxPath)) {
          return tmuxPath;
        }
      } catch {
        // Continue checking other paths
      }
    }

    // If not found in common locations, try which command
    const { stdout } = await execaCommand("which tmux", {
      shell: true,
      env: {
        PATH: ENV_PATH,
      },
    });

    if (stdout.trim()) {
      return stdout.trim();
    }

    throw new Error("tmux not found in PATH");
  } catch (error) {
    logError("Failed to find tmux", error);
    throw new Error("tmux not found or not installed");
  }
}

export async function tmux(command: string) {
  try {
    const tmuxPath = await getTmuxPath();
    const result = await execaCommand(`${tmuxPath} ${command}`, {
      shell: true,
      env: {
        ...process.env,
        PATH: ENV_PATH,
      },
    });
    return result;
  } catch (error) {
    logError("tmux command failed", { command, error });
    throw error;
  }
}

export async function execWithEnv(command: string) {
  return await execaCommand(command, {
    env: {
      ...process.env,
      PATH: ENV_PATH,
    },
  });
}
