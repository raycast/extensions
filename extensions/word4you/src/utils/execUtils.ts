import { spawnSync, spawn } from "child_process";

// Clean up error message from CLI output
function cleanErrorMessage(message: string): string {
  return (
    message
      // eslint-disable-next-line no-control-regex
      .replace(/\x1b\[[0-9;]*m/g, "") // Remove ANSI color codes
      .replace(/❌\s*/g, "") // Remove emoji
      .replace(/^Error:\s*/gim, "") // Remove "Error:" prefix
      .trim()
  );
}

// Execute a CLI command with proper error handling
// Captures both stdout and stderr to handle errors even when exit code is 0
export function executeCliCommand(
  executablePath: string,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeout?: number;
  } = {},
): string {
  // Use spawnSync to capture both stdout and stderr
  const result = spawnSync(executablePath, args, {
    encoding: "utf8",
    timeout: options.timeout || 30000,
    cwd: options.cwd || process.cwd(),
    env: options.env || process.env,
  });

  // Check for spawn errors
  if (result.error) {
    throw new Error(result.error.message);
  }

  const stdout = result.stdout?.trim() || "";
  const stderr = result.stderr?.trim() || "";

  // If there's stderr content, it might be an error
  if (stderr) {
    const cleanedError = cleanErrorMessage(stderr);
    // If stdout is empty and stderr has content, throw the error
    if (!stdout && cleanedError) {
      throw new Error(cleanedError);
    }
  }

  // If exit code is non-zero, throw error
  if (result.status !== 0) {
    const errorMessage = cleanErrorMessage(stderr) || `Command failed with exit code ${result.status}`;
    throw new Error(errorMessage);
  }

  return stdout;
}

// Execute a CLI command with streaming output via callback and promise completion
export function executeCliWithStatusUpdate(
  executablePath: string,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    onStatusUpdate?: (message: string) => void;
  } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    // Use spawn for better control over arguments and streaming
    const childProcess = spawn(executablePath, args, {
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env,
      stdio: ["pipe", "pipe", "pipe"], // Enable piping for all streams
    });

    // Stream stdout data as it comes
    childProcess.stdout.on("data", (data: Buffer) => {
      const chunk = data.toString("utf8");

      if (options.onStatusUpdate) {
        // Send each line as it comes, trimming whitespace
        const lines = chunk.split("\n").filter((line) => line.trim());
        lines.forEach((line) => options.onStatusUpdate!(line.trim()));
      }
    });

    // Stream stderr data as it comes
    childProcess.stderr.on("data", (data: Buffer) => {
      const chunk = data.toString("utf8");

      if (options.onStatusUpdate) {
        // Send error lines as they come
        const lines = chunk.split("\n").filter((line) => line.trim());
        lines.forEach((line) => options.onStatusUpdate!(`Error: ${line.trim()}`));
      }
    });

    // Handle process completion
    childProcess.on("close", (code) => {
      resolve(code === 0);
    });

    // Handle process errors
    childProcess.on("error", (error) => {
      if (options.onStatusUpdate) {
        options.onStatusUpdate(`Error: ${error.message}`);
      }

      resolve(false);
    });
  });
}
