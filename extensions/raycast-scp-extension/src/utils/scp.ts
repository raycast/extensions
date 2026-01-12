import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { join } from "path";
import { TransferOptions, TransferDirection, ScpResult } from "../types/server";

const execAsync = promisify(exec);

/**
 * Builds an SCP command string based on transfer options
 * @param options - Transfer options including direction, paths, and host config
 * @returns The constructed SCP command string
 */
export function buildScpCommand(options: TransferOptions): string {
  const { hostConfig, localPath, remotePath, direction } = options;
  const configPath = join(homedir(), ".ssh", "config");
  const hostAlias = hostConfig.host;

  // Base command with config file reference and recursive flag
  const baseCommand = `scp -F ${configPath} -r`;

  if (direction === TransferDirection.UPLOAD) {
    // Upload: scp -F ~/.ssh/config -r {localPath} {hostAlias}:{remotePath}
    return `${baseCommand} ${localPath} ${hostAlias}:${remotePath}`;
  } else {
    // Download: scp -F ~/.ssh/config -r {hostAlias}:{remotePath} {localPath}
    return `${baseCommand} ${hostAlias}:${remotePath} ${localPath}`;
  }
}

/**
 * Parse error output to provide user-friendly error messages
 * @param error - The error object from exec
 * @returns User-friendly error message
 */
function parseScpError(error: {
  stderr?: string;
  message?: string;
  killed?: boolean;
  signal?: string;
  code?: number;
}): string {
  const stderr = error.stderr || "";
  const message = error.message || "";
  const combinedError = `${stderr} ${message}`.toLowerCase();

  // Log detailed error for debugging
  console.error("SCP Error Details:", {
    code: error.code,
    signal: error.signal,
    stderr: error.stderr,
    message: error.message,
  });

  // Connection timeout
  if (error.killed && error.signal === "SIGTERM") {
    return "Connection timed out after 5 minutes. The server may be unreachable or the transfer is taking too long.";
  }

  // Authentication failures
  if (
    combinedError.includes("permission denied") &&
    combinedError.includes("publickey")
  ) {
    return "Authentication failed: SSH key not accepted. Check your SSH key configuration.";
  }
  if (combinedError.includes("permission denied")) {
    return "Authentication failed: Permission denied. Check your credentials and SSH configuration.";
  }
  if (combinedError.includes("host key verification failed")) {
    return "Host key verification failed. You may need to add the host to your known_hosts file.";
  }
  if (combinedError.includes("no such identity")) {
    return "SSH key file not found. Check the IdentityFile path in your SSH config.";
  }

  // Connection issues
  if (combinedError.includes("connection refused")) {
    return "Connection refused: The server is not accepting connections on the specified port.";
  }
  if (
    combinedError.includes("connection timed out") ||
    combinedError.includes("operation timed out")
  ) {
    return "Connection timed out: Unable to reach the server. Check your network connection and server address.";
  }
  if (combinedError.includes("no route to host")) {
    return "No route to host: The server address is unreachable. Check the hostname or IP address.";
  }
  if (combinedError.includes("could not resolve hostname")) {
    return "Could not resolve hostname: The server address is invalid or DNS lookup failed.";
  }
  if (combinedError.includes("network is unreachable")) {
    return "Network is unreachable: Check your internet connection.";
  }

  // File/directory issues
  if (combinedError.includes("no such file or directory")) {
    return "File not found: The specified file or directory does not exist on the remote server.";
  }
  if (combinedError.includes("is a directory")) {
    return "Target is a directory: Use a directory path or ensure the -r flag is included.";
  }
  if (combinedError.includes("not a directory")) {
    return "Target is not a directory: The destination path must be a directory.";
  }
  if (
    combinedError.includes("permission denied") &&
    !combinedError.includes("publickey")
  ) {
    return "Permission denied: You do not have permission to access the file or directory on the remote server.";
  }

  // Disk space issues
  if (combinedError.includes("no space left on device")) {
    return "No space left on device: The destination has insufficient disk space.";
  }
  if (combinedError.includes("disk quota exceeded")) {
    return "Disk quota exceeded: You have exceeded your disk quota on the remote server.";
  }

  // Generic fallback with sanitized message
  const sanitizedMessage = stderr || message || "Unknown error occurred";
  return `Transfer failed: ${sanitizedMessage}`;
}

/**
 * Executes an SCP command and returns the result
 * @param options - Transfer options including direction, paths, and host config
 * @returns Promise resolving to ScpResult with success status and message
 */
export async function executeScp(options: TransferOptions): Promise<ScpResult> {
  const command = buildScpCommand(options);

  try {
    // Execute with 5 minute timeout (300000 ms)
    const { stderr } = await execAsync(command, {
      timeout: 300000,
    });

    // Success if no error thrown
    return {
      success: true,
      message: "Transfer completed successfully",
      stderr: stderr || undefined,
    };
  } catch (error) {
    // Parse error and provide user-friendly message
    const userMessage = parseScpError(
      error as {
        stderr?: string;
        message?: string;
        killed?: boolean;
        signal?: string;
        code?: number;
      },
    );

    return {
      success: false,
      message: userMessage,
      stderr: (error as { stderr?: string }).stderr || undefined,
    };
  }
}
