import { exec } from "child_process";
import { spawn } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { join } from "path";
import { statSync } from "fs";
import {
  TransferOptions,
  TransferDirection,
  RsyncResult,
  RsyncOptions,
} from "../types/server";
import { shellEscape } from "./shellEscape";

const execAsync = promisify(exec);

/**
 * Builds rsync flags string from options
 * @param options - Rsync options
 * @returns String of rsync flags
 */
function buildRsyncFlags(options?: RsyncOptions): string {
  const shortFlags: string[] = ["a", "v", "z"]; // Base flags: archive, verbose, compress

  if (options?.humanReadable) {
    shortFlags.push("h"); // Human-readable file sizes
  }

  if (options?.progress) {
    shortFlags.push("P"); // Progress and partial transfers (equivalent to --partial --progress)
  }

  // Combine short flags into a single -flag string
  const flags = `-${shortFlags.join("")}`;

  // Add long-form flags
  const longFlags: string[] = [];
  if (options?.delete) {
    longFlags.push("--delete"); // Delete extraneous files from destination
  }

  return longFlags.length > 0 ? `${flags} ${longFlags.join(" ")}` : flags;
}

/**
 * Expands tilde (~) to home directory path
 * @param path - The path that may contain ~
 * @returns Path with ~ expanded to home directory
 */
function expandHomeDir(path: string): string {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  if (path === "~") {
    return homedir();
  }
  return path;
}

/**
 * Normalizes a path by removing trailing slash
 * @param path - The path to normalize
 * @returns Path without trailing slash
 */
function removeTrailingSlash(path: string): string {
  return path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
}

/**
 * Normalizes a destination path by ensuring it ends with a trailing slash
 * This ensures rsync creates the source directory inside the destination
 * @param path - The destination path to normalize
 * @returns Path with trailing slash
 */
function ensureTrailingSlash(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

/**
 * Normalizes paths for rsync to ensure directories are copied as directories
 * For upload: if localPath is a directory, remove trailing slash from source and add to destination
 * For download: add trailing slash to localPath destination to ensure remote directory is created inside
 * @param options - Transfer options
 * @returns Normalized paths
 */
function normalizePathsForRsync(options: TransferOptions): {
  normalizedLocalPath: string;
  normalizedRemotePath: string;
} {
  const { localPath, remotePath, direction } = options;

  // Expand ~ in local paths (for both upload and download)
  const expandedLocalPath = expandHomeDir(localPath);

  if (direction === TransferDirection.UPLOAD) {
    // For upload, check if localPath is a directory
    try {
      const stats = statSync(expandedLocalPath);
      if (stats.isDirectory()) {
        // Source directory: remove trailing slash (if present) to copy directory itself
        // Destination: ensure trailing slash to create source directory inside destination
        return {
          normalizedLocalPath: removeTrailingSlash(expandedLocalPath),
          normalizedRemotePath: ensureTrailingSlash(remotePath),
        };
      }
    } catch (error) {
      // If we can't stat the path, proceed with original paths
      // This could happen if the path doesn't exist yet (shouldn't happen after validation)
      console.warn("Could not stat local path, using original paths:", error);
    }
    // For files, use paths as-is (but with ~ expanded)
    return {
      normalizedLocalPath: expandedLocalPath,
      normalizedRemotePath: remotePath,
    };
  } else {
    // For download, we can't check if remotePath is a directory without SSH access
    // But we can ensure the local destination has a trailing slash
    // This will make rsync create the remote directory inside the local destination
    // Remove trailing slash from remote path (if present) to copy directory itself
    // Add trailing slash to local path to ensure remote directory is created inside
    return {
      normalizedLocalPath: ensureTrailingSlash(expandedLocalPath),
      normalizedRemotePath: removeTrailingSlash(remotePath),
    };
  }
}

/**
 * Builds an rsync command string based on transfer options
 * @param options - Transfer options including direction, paths, and host config
 * @returns The constructed rsync command string
 */
export function buildRsyncCommand(options: TransferOptions): string {
  const { hostConfig, direction, rsyncOptions } = options;
  const configPath = join(homedir(), ".ssh", "config");
  const hostAlias = hostConfig.host;

  // Normalize paths to ensure directories are copied as directories
  const { normalizedLocalPath, normalizedRemotePath } =
    normalizePathsForRsync(options);

  // Build rsync flags
  const flags = buildRsyncFlags(rsyncOptions);

  // Escape all user-provided inputs to prevent command injection
  const escapedLocalPath = shellEscape(normalizedLocalPath);
  const escapedRemotePath = shellEscape(normalizedRemotePath);
  const escapedHostAlias = shellEscape(hostAlias);

  // Escape the SSH command for the -e flag
  // configPath comes from homedir() so it's safe, but we escape the whole command for consistency
  const escapedSshCommand = shellEscape(`ssh -F ${configPath}`);

  // Base command with SSH config
  // -e: specify SSH command with config file
  const baseCommand = `rsync -e ${escapedSshCommand} ${flags}`;

  if (direction === TransferDirection.UPLOAD) {
    // Upload: rsync -e "ssh -F ~/.ssh/config" [flags] {localPath} {hostAlias}:{remotePath}
    // Escape all user-provided paths to prevent command injection
    return `${baseCommand} ${escapedLocalPath} ${escapedHostAlias}:${escapedRemotePath}`;
  } else {
    // Download: rsync -e "ssh -F ~/.ssh/config" [flags] {hostAlias}:{remotePath} {localPath}
    // Escape all user-provided paths to prevent command injection
    return `${baseCommand} ${escapedHostAlias}:${escapedRemotePath} ${escapedLocalPath}`;
  }
}

/**
 * Parse error output to provide user-friendly error messages
 * @param error - The error object from exec
 * @returns User-friendly error message
 */
function parseRsyncError(error: {
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
  console.error("Rsync Error Details:", {
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
    return "Target is a directory: Use a directory path or ensure the path ends with a slash.";
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
 * Parses rsync progress line to extract progress information
 * @param line - Progress line from rsync output
 * @returns Formatted progress message or null
 */
function parseProgressLine(line: string): string | null {
  // rsync -P output format: "    1,234,567  67%  123.45kB/s    0:00:05"
  // or: "file.txt\n    1,234,567  67%  123.45kB/s    0:00:05"
  const progressMatch = line.match(
    /(\d{1,3}(?:,\d{3})*)\s+(\d+)%\s+([\d.]+[KMGT]?B\/s)\s+(\d+:\d{2}:\d{2})/,
  );

  if (progressMatch) {
    const [, , percent, speed, time] = progressMatch;
    return `${percent}% • ${speed} • ${time} remaining`;
  }

  // Look for summary lines with speedup
  if (line.includes("speedup")) {
    return line.trim();
  }

  return null;
}

/**
 * Executes an rsync command and returns the result
 * @param options - Transfer options including direction, paths, and host config
 * @param onProgress - Optional callback function to receive real-time progress updates
 * @returns Promise resolving to RsyncResult with success status and message
 */
export async function executeRsync(
  options: TransferOptions,
  onProgress?: (message: string) => void,
): Promise<RsyncResult> {
  const command = buildRsyncCommand(options);
  const isProgressEnabled = options.rsyncOptions?.progress;

  // If progress is enabled and callback provided, use spawn for real-time updates
  if (isProgressEnabled && onProgress) {
    return executeRsyncWithProgress(options, onProgress);
  }

  // Otherwise use exec for simpler execution
  try {
    // Execute with 5 minute timeout (300000 ms)
    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000,
    });

    // Success if no error thrown
    // Format output message to show key information
    let outputMessage = "Transfer completed successfully";

    if (stdout) {
      const lines = stdout.trim().split("\n");

      // Extract summary line (usually the last line with total stats)
      const summaryLine = lines[lines.length - 1];

      // If using -P (progress), look for progress lines
      const progressLines = lines.filter(
        (line) =>
          line.includes("%") ||
          line.includes("speedup") ||
          line.includes("sent"),
      );

      // If using -h (human-readable), look for file size info
      const fileInfoLines = lines.filter(
        (line) =>
          line.match(/\d+[KMGT]?B/) || // Matches sizes like 1.5M, 500K, etc.
          line.includes("files") ||
          line.includes("bytes"),
      );

      // Prioritize showing summary or progress info
      if (
        summaryLine &&
        (summaryLine.includes("total") || summaryLine.includes("speedup"))
      ) {
        outputMessage = summaryLine;
      } else if (progressLines.length > 0) {
        outputMessage = progressLines[progressLines.length - 1];
      } else if (fileInfoLines.length > 0) {
        outputMessage = fileInfoLines[fileInfoLines.length - 1];
      } else if (lines.length > 0) {
        // Show last few lines if no specific format found
        outputMessage = lines.slice(-2).join("\n");
      }
    }

    return {
      success: true,
      message: outputMessage,
      stdout: stdout || undefined,
      stderr: stderr || undefined,
    };
  } catch (error) {
    const errorObj = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
      killed?: boolean;
      signal?: string;
      code?: number;
    };

    // Parse error and provide user-friendly message
    const userMessage = parseRsyncError(errorObj);

    // Include stdout if available (rsync might output useful info even on error)
    const outputMessage = errorObj.stdout
      ? `${userMessage}\n\nOutput: ${errorObj.stdout.split("\n").slice(-2).join("\n")}`
      : userMessage;

    return {
      success: false,
      message: outputMessage,
      stdout: errorObj.stdout || undefined,
      stderr: errorObj.stderr || undefined,
    };
  }
}

/**
 * Executes rsync with real-time progress updates using spawn
 * @param options - Transfer options
 * @param onProgress - Callback function to receive progress updates
 * @returns Promise resolving to RsyncResult
 */
async function executeRsyncWithProgress(
  options: TransferOptions,
  onProgress: (message: string) => void,
): Promise<RsyncResult> {
  // Use the full command string with shell for proper SSH handling
  const fullCommand = buildRsyncCommand(options);

  return new Promise((resolve) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let lastProgressUpdate = Date.now();
    const progressUpdateInterval = 500; // Update every 500ms to avoid too frequent updates

    const rsyncProcess = spawn(fullCommand, {
      shell: true,
    });

    // Set timeout
    const timeout = setTimeout(() => {
      rsyncProcess.kill("SIGTERM");
      resolve({
        success: false,
        message: "Transfer timed out after 5 minutes",
        stdout: Buffer.concat(stdoutChunks as readonly Uint8Array[]).toString(),
        stderr: Buffer.concat(stderrChunks as readonly Uint8Array[]).toString(),
      });
    }, 300000); // 5 minutes

    rsyncProcess.stdout.on("data", (data: Buffer) => {
      stdoutChunks.push(data);
      const output = data.toString();
      const lines = output.split("\n");

      // Parse and update progress
      for (const line of lines) {
        const progressMessage = parseProgressLine(line);
        if (progressMessage) {
          const now = Date.now();
          // Throttle progress updates
          if (now - lastProgressUpdate >= progressUpdateInterval) {
            onProgress(progressMessage);
            lastProgressUpdate = now;
          }
        }
      }
    });

    rsyncProcess.stderr.on("data", (data: Buffer) => {
      stderrChunks.push(data);
    });

    rsyncProcess.on("close", (code) => {
      clearTimeout(timeout);
      const stdout = Buffer.concat(
        stdoutChunks as readonly Uint8Array[],
      ).toString();
      const stderr = Buffer.concat(
        stderrChunks as readonly Uint8Array[],
      ).toString();

      if (code === 0) {
        // Format output message
        let outputMessage = "Transfer completed successfully";

        if (stdout) {
          const lines = stdout.trim().split("\n");
          const summaryLine = lines[lines.length - 1];

          if (
            summaryLine &&
            (summaryLine.includes("total") || summaryLine.includes("speedup"))
          ) {
            outputMessage = summaryLine;
          } else if (lines.length > 0) {
            outputMessage = lines.slice(-2).join("\n");
          }
        }

        resolve({
          success: true,
          message: outputMessage,
          stdout: stdout || undefined,
          stderr: stderr || undefined,
        });
      } else {
        const userMessage = parseRsyncError({
          stderr,
          message: `Process exited with code ${code}`,
          code: code ?? undefined,
        });

        resolve({
          success: false,
          message: userMessage,
          stdout: stdout || undefined,
          stderr: stderr || undefined,
        });
      }
    });

    rsyncProcess.on("error", (error) => {
      clearTimeout(timeout);
      const userMessage = parseRsyncError({
        stderr: error.message,
        message: error.message,
      });

      resolve({
        success: false,
        message: userMessage,
        stdout:
          Buffer.concat(stdoutChunks as readonly Uint8Array[]).toString() ||
          undefined,
        stderr:
          Buffer.concat(stderrChunks as readonly Uint8Array[]).toString() ||
          undefined,
      });
    });
  });
}
