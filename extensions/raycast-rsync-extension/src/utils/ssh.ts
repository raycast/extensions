import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { join } from "path";
import { SSHHostConfig, RemoteFile } from "../types/server";
import { shellEscape } from "./shellEscape";

const execAsync = promisify(exec);

/**
 * Execute ls command on remote server to list files
 * @param hostConfig - SSH host configuration
 * @param remotePath - Path to list on remote server
 * @returns Promise resolving to array of RemoteFile objects
 */
/**
 * Escapes a remote path for use in SSH commands, handling tilde expansion
 * For paths starting with ~, we allow the remote shell to expand it by not escaping the ~
 * @param remotePath - The remote path to escape
 * @returns Escaped path that allows ~ expansion on remote shell
 */
function escapeRemotePath(remotePath: string): string {
  // If path starts with ~/, allow remote shell to expand ~
  // We escape only the part after ~/ to prevent injection while allowing ~ expansion
  if (remotePath.startsWith("~/")) {
    const pathAfterTilde = remotePath.slice(2); // Everything after "~/"
    // Escape the path part to prevent injection, but keep ~/ unescaped
    // This will result in ~/'escaped-path' which allows ~ expansion
    const escapedPath = shellEscape(pathAfterTilde);
    return `~/${escapedPath}`;
  }
  if (remotePath === "~") {
    // Standalone ~ doesn't need escaping
    return "~";
  }
  // For all other paths, escape normally
  return shellEscape(remotePath);
}

export async function executeRemoteLs(
  hostConfig: SSHHostConfig,
  remotePath: string,
): Promise<RemoteFile[]> {
  const configPath = join(homedir(), ".ssh", "config");
  const hostAlias = hostConfig.host;

  // Escape all user-provided inputs to prevent command injection
  const escapedConfigPath = shellEscape(configPath);
  const escapedHostAlias = shellEscape(hostAlias);
  // Use special escaping for remote paths to allow ~ expansion
  const escapedRemotePath = escapeRemotePath(remotePath);

  // Use ls -lAh for detailed listing with human-readable sizes
  // -l: long format, -A: all files except . and .., -h: human-readable sizes
  // Construct the remote command with properly escaped remotePath
  // The remote command is: ls -lAh <escaped-remote-path>
  // We escape the entire remote command for the local shell
  const remoteCommand = `ls -lAh ${escapedRemotePath}`;
  const escapedRemoteCommand = shellEscape(remoteCommand);

  const command = `ssh -F ${escapedConfigPath} ${escapedHostAlias} ${escapedRemoteCommand}`;

  console.log("Executing remote ls:", command);

  try {
    const { stdout } = await execAsync(command, {
      timeout: 30000, // 30 second timeout
    });

    // Parse ls output
    const files = parseLsOutput(stdout);
    console.log(`Found ${files.length} files in ${remotePath}`);

    return files;
  } catch (error) {
    const errorMessage = parseRemoteLsError(
      error as {
        stderr?: string;
        message?: string;
        code?: number;
      },
    );
    console.error("Remote ls error:", error);
    throw new Error(errorMessage);
  }
}

/**
 * Parse ls -lAh output into RemoteFile objects
 * @param output - stdout from ls command
 * @returns Array of RemoteFile objects
 */
function parseLsOutput(output: string): RemoteFile[] {
  const lines = output.trim().split("\n");
  const files: RemoteFile[] = [];

  // Skip the first line if it starts with "total" (summary line)
  const startIndex = lines[0]?.startsWith("total") ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse ls -l format: permissions links owner group size month day time name
    // Example: drwxr-xr-x  5 user group 4.0K Jan 13 10:30 dirname
    const parts = line.split(/\s+/);

    if (parts.length < 9) continue; // Skip malformed lines

    const permissions = parts[0];
    const size = parts[4];
    const month = parts[5];
    const day = parts[6];
    const time = parts[7];
    const name = parts.slice(8).join(" "); // Handle filenames with spaces

    // Check if it's a directory (first char is 'd')
    const isDirectory = permissions.startsWith("d");

    files.push({
      name,
      isDirectory,
      size: isDirectory ? "" : size,
      permissions,
      modifiedDate: `${month} ${day} ${time}`,
    });
  }

  return files;
}

/**
 * Parse error output from remote ls command
 * @param error - The error object from exec
 * @returns User-friendly error message
 */
function parseRemoteLsError(error: {
  stderr?: string;
  message?: string;
  code?: number;
}): string {
  const stderr = error.stderr || "";
  const message = error.message || "";
  const combinedError = `${stderr} ${message}`.toLowerCase();

  console.error("Remote ls error details:", {
    code: error.code,
    stderr: error.stderr,
    message: error.message,
  });

  // Connection errors
  if (combinedError.includes("connection refused")) {
    return "Connection refused: The server is not accepting connections.";
  }
  if (
    combinedError.includes("connection timed out") ||
    combinedError.includes("operation timed out")
  ) {
    return "Connection timed out: Unable to reach the server.";
  }
  if (combinedError.includes("could not resolve hostname")) {
    return "Could not resolve hostname: The server address is invalid.";
  }

  // Authentication errors
  if (
    combinedError.includes("permission denied") &&
    combinedError.includes("publickey")
  ) {
    return "Authentication failed: SSH key not accepted.";
  }
  if (combinedError.includes("permission denied")) {
    return "Permission denied: Check your credentials.";
  }

  // File/directory errors
  if (combinedError.includes("no such file or directory")) {
    return "Directory not found: The specified path does not exist on the remote server.";
  }
  if (combinedError.includes("not a directory")) {
    return "Not a directory: The specified path is a file, not a directory.";
  }

  // Generic fallback
  return `Failed to list remote files: ${stderr || message || "Unknown error"}`;
}
