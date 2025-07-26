import { execSync, exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { getCliFilepath } from "../config";

const execPromise = promisify(exec);

// Check if a command exists in PATH
export function commandExistsInPath(command: string): string | null {
  try {
    const pathOutput = execSync(`which ${command}`, { encoding: "utf8" }).trim();
    if (pathOutput && fs.existsSync(pathOutput)) {
      return pathOutput;
    }
    return null;
  } catch {
    return null;
  }
}

// Get the best available executable path for word4you CLI
export function getAvailableExecutablePath(): string | null {
  // Check if our downloaded version exists
  const downloadedCli = getCliFilepath();
  if (fs.existsSync(downloadedCli)) {
    return downloadedCli;
  }

  // Check if it's available in PATH
  const pathCli = commandExistsInPath("word4you");
  if (pathCli) {
    return pathCli;
  }

  return null;
}

// Escape executable path for shell execution
export function escapeExecutablePath(executablePath: string): string {
  return executablePath.includes(" ") || executablePath.includes("(")
    ? `'${executablePath.replace(/'/g, "'\\''")}'`
    : executablePath;
}

// Execute a CLI command with proper error handling
export function executeCliCommand(
  executablePath: string,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeout?: number;
  } = {},
): string {
  const escapedPath = escapeExecutablePath(executablePath);
  const escapedArgs = args.map((arg) => `"${arg.replace(/"/g, '\\"')}"`);
  const command = `${escapedPath} ${escapedArgs.join(" ")}`;

  return execSync(command, {
    encoding: "utf8",
    timeout: options.timeout || 30000,
    cwd: options.cwd || process.cwd(),
    env: options.env || process.env,
  });
}

// Execute a CLI command with promise-based error handling
export async function executeCliCommandAsync(
  executablePath: string,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeout?: number;
    onStatusUpdate?: (message: string) => void;
  } = {},
): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const escapedPath = escapeExecutablePath(executablePath);
    const escapedArgs = args.map((arg) => `"${arg.replace(/"/g, '\\"')}"`);
    const command = `${escapedPath} ${escapedArgs.join(" ")}`;

    const { stdout, stderr } = await execPromise(command, {
      encoding: "utf8",
      timeout: options.timeout || 30000,
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env,
    });

    const output = stdout.trim();

    if (options.onStatusUpdate) {
      options.onStatusUpdate(output);
    }

    return { success: true, output, error: stderr || undefined };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (options.onStatusUpdate) {
      options.onStatusUpdate(`Error: ${errorMessage}`);
    }

    return { success: false, output: "", error: errorMessage };
  }
}
