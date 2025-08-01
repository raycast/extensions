import { execSync, spawn } from "child_process";

// Escape executable path for shell execution
export function escapeExecutablePath(executablePath: string): string {
  return executablePath.includes(" ") || executablePath.includes("(")
    ? `'${executablePath.replace(/'/g, "'\\''")}'`
    : executablePath;
}

function escapeArgs(args: string[]): string[] {
  return args.map((arg) => `"${arg.replace(/"/g, '\\"')}"`);
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
  const escapedArgs = escapeArgs(args);
  const command = `${escapedPath} ${escapedArgs.join(" ")}`;

  return execSync(command, {
    encoding: "utf8",
    timeout: options.timeout || 30000,
    cwd: options.cwd || process.cwd(),
    env: options.env || process.env,
  });
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
