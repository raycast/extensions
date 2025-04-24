import { getPreferenceValues, showToast, Toast, LocalStorage, showHUD } from "@raycast/api";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// --- Configuration ---
const DEFAULT_GTAR_PATH = "/opt/homebrew/bin/gtar"; // Default path for GNU tar if not specified in preferences
const EXCLUDE_PATTERNS: ReadonlyArray<string> = [
  // Patterns to exclude during backup
  "*/node_modules",
  "*/.next",
  "*/.DS_Store",
  "*/build",
  "*/dist",
  "*/.cache",
  "*/.idea",
  "*/.svelte-kit",
];
const LOCK_KEY = "backupLock"; // LocalStorage key to prevent concurrent backups

// --- Preferences Interface ---
interface Preferences {
  gtarPath?: string;
  sourceDirectory: string;
  backupDestination: string;
  archivePrefix?: string;
}

// --- Utility Functions ---

/**
 * Resolves paths starting with `~` to the user's home directory.
 * @param inputPath The path string to resolve.
 * @returns The resolved absolute path.
 */
function resolvePath(inputPath: string): string {
  if (inputPath?.startsWith("~" + path.sep)) {
    return path.join(os.homedir(), inputPath.slice(1));
  }
  return inputPath;
}

/**
 * Generates a timestamp string in YYYYMMDD_HHMMSS format.
 * @returns The formatted timestamp string.
 */
function getFormattedTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Checks if a file exists and is executable. Throws an error if not.
 * @param filePath The path to the executable file.
 */
function ensureExecutable(filePath: string): void {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`File not found or not executable: ${filePath}\nDetails: ${message}`);
  }
}

/**
 * Ensures a directory exists. Optionally creates it if it doesn't. Throws an error on failure or if the path is not a directory.
 * @param dirPath The path to the directory.
 * @param create If true, creates the directory recursively if it doesn't exist. Defaults to false.
 */
function ensureDirectory(dirPath: string, create: boolean = false): void {
  try {
    if (fs.existsSync(dirPath)) {
      if (!fs.statSync(dirPath).isDirectory()) {
        throw new Error(`Path exists but is not a directory: ${dirPath}`);
      }
    } else if (create) {
      console.log(`Creating directory: ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    } else {
      throw new Error(`Directory not found: ${dirPath}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to ensure directory ${dirPath}: ${message}`);
  }
}

// --- Core Backup Logic ---

/**
 * Performs the backup operation using gtar.
 * @param gtarPath Path to the gtar executable.
 * @param sourceDir Directory to back up.
 * @param backupDestDir Directory where the backup archive will be saved.
 * @param archiveNamePrefix Prefix for the generated archive file name.
 */
async function performBackup(
  gtarPath: string,
  sourceDir: string,
  backupDestDir: string,
  archiveNamePrefix: string,
): Promise<void> {
  // 1. Validate inputs and environment
  ensureExecutable(gtarPath);
  ensureDirectory(sourceDir); // Ensure source exists
  ensureDirectory(backupDestDir, true); // Ensure destination exists, create if needed

  // 2. Prepare archive details
  const timestamp = getFormattedTimestamp();
  const archiveName = `${archiveNamePrefix}${timestamp}.tar.gz`;
  const fullArchivePath = path.join(backupDestDir, archiveName);
  const sourceParentDir = path.dirname(sourceDir); // Parent directory for -C gtar option
  const sourceBaseName = path.basename(sourceDir); // Directory name to archive

  // 3. Construct gtar arguments
  const args: string[] = [
    "-czvf", // Create, gzip, verbose, file
    fullArchivePath, // Output archive file path
    ...EXCLUDE_PATTERNS.map((pattern) => `--exclude=${pattern}`), // Exclusion patterns
    "-C", // Change directory before archiving
    sourceParentDir, // Directory to change to
    sourceBaseName, // Item to archive relative to the changed directory
  ];

  console.log("--- Starting Backup ---");
  console.log(`Source: ${sourceDir}`);
  console.log(`Destination: ${fullArchivePath}`);
  console.log(`Using archive name prefix: ${archiveNamePrefix}`);
  console.log(`Executing: ${gtarPath} ${args.join(" ")}`);

  let child: ChildProcessWithoutNullStreams | null = null;
  let runningToast: Toast | undefined;

  try {
    // 4. Show initial running toast with cancellation option
    runningToast = await showToast({
      style: Toast.Style.Animated,
      title: "Backup Running...",
      message: `Creating archive: ${archiveName}`,
      primaryAction: {
        title: "Cancel Backup",
        onAction: async (toast) => {
          console.log("Cancel action triggered.");
          if (child && !child.killed) {
            console.log(`Attempting to kill gtar process (PID: ${child.pid})...`);
            const killed = child.kill("SIGTERM"); // Send termination signal
            if (killed) {
              console.log("Sent SIGTERM to gtar process.");
              toast.title = "Cancelling...";
              toast.message = "Waiting for process termination...";
            } else {
              console.error("Failed to send SIGTERM to gtar process.");
              toast.title = "Cancel Failed";
              toast.message = "Could not signal the backup process.";
              toast.style = Toast.Style.Failure;
            }
          } else {
            console.log("Cancel action: Process already finished or not started.");
            // Optionally update toast or just let it resolve naturally
            toast.title = "Process Finished";
            toast.message = "Backup completed or was already stopped.";
          }
        },
      },
    });

    // 5. Execute gtar process
    await new Promise<void>((resolve, reject) => {
      child = spawn(gtarPath, args);
      let currentDir = "";

      // Helper to process stdout/stderr and update toast message
      const handleOutput = (data: Buffer) => {
        const output = data.toString();
        // console.log("gtar output chunk:", output.trim()); // Optional: Log raw output

        // Attempt to find the top-level directory being processed for better feedback
        const lines = output.split("\n");
        for (const line of lines) {
          const trimmedLine = line.trim();
          // Check if the line looks like a directory entry being added by verbose gtar
          if (trimmedLine.startsWith(sourceBaseName + "/") && trimmedLine.endsWith("/")) {
            const relativePath = trimmedLine.substring(sourceBaseName.length + 1); // Path relative to sourceBaseName
            const topLevelDir = relativePath.split("/")[0]; // Get the first part of the path
            if (topLevelDir && topLevelDir !== currentDir) {
              currentDir = topLevelDir;
              const message = `Backing up /${currentDir}`;
              if (runningToast) {
                runningToast.message = message; // Update toast message
              }
              console.log(`Updating toast: ${message}`);
              // Optimization: Once we find a new top-level dir in this chunk, stop searching
              break;
            }
          }
        }
      };

      child.stdout?.on("data", handleOutput);
      child.stderr?.on("data", handleOutput); // Capture stderr as well, often contains verbose output

      child.on("error", (error) => {
        console.error("Spawn error:", error);
        reject(new Error(`Failed to start gtar process: ${error.message}`));
      });

      child.on("close", (code, signal) => {
        console.log(`gtar process closed with code ${code}, signal ${signal}`);
        if (signal === "SIGTERM") {
          reject(new Error("Backup cancelled by user."));
        } else if (code === 0) {
          resolve(); // Success
        } else {
          reject(new Error(`Backup process failed with exit code ${code}. Check logs.`));
        }
      });
    });

    // 6. Success: Hide running toast and show success message
    await runningToast?.hide();
    await showToast({
      style: Toast.Style.Success,
      title: "Backup Successful!",
      message: `Archive saved: ${archiveName}`,
    });
    console.log("--- Backup finished successfully ---");
  } catch (backupError) {
    // 7. Failure: Hide running toast (if exists) and handle error
    await runningToast?.hide().catch(() => {}); // Hide safely
    console.error("Caught error during backup execution:", backupError);
    // Re-throw the original error to be handled by the main command function
    throw backupError;
  }
}

// --- Raycast Command Export ---

export default async function command() {
  // 1. Concurrency Check: Prevent multiple backups at once
  const lockExists = await LocalStorage.getItem(LOCK_KEY);
  if (lockExists) {
    console.warn(`Concurrency lock '${LOCK_KEY}' found. Another backup may be running.`);
    await showHUD("Backup Already in Progress"); // Less intrusive notification
    return; // Exit early
  }

  // 2. Acquire Lock
  await LocalStorage.setItem(LOCK_KEY, new Date().toISOString()); // Store timestamp as lock value
  console.log(`Acquired lock '${LOCK_KEY}'.`);

  let preparingToast: Toast | undefined;

  try {
    // 3. Show "Preparing" toast
    preparingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Preparing Backup...",
    });

    // 4. Get and resolve preferences
    const prefs = getPreferenceValues<Preferences>();
    const gtarPath = prefs.gtarPath || DEFAULT_GTAR_PATH;
    const sourceDirectory = resolvePath(prefs.sourceDirectory);
    const backupDestination = resolvePath(prefs.backupDestination);

    // Determine archive prefix: Use preference, or default to source directory name
    let resolvedArchivePrefix = prefs.archivePrefix?.trim();
    if (!resolvedArchivePrefix) {
      resolvedArchivePrefix = path.basename(sourceDirectory) + "_";
      console.log(`Using default archive prefix based on source directory: '${resolvedArchivePrefix}'`);
    } else {
      console.log(`Using provided archive prefix: '${resolvedArchivePrefix}'`);
    }

    console.log(`Resolved Paths: gtar='${gtarPath}', source='${sourceDirectory}', destination='${backupDestination}'`);

    // Basic validation of resolved preferences
    if (!gtarPath || !sourceDirectory || !backupDestination || !resolvedArchivePrefix) {
      throw new Error(
        "Missing required configuration: Check gtar path, source/destination directories, and archive prefix.",
      );
    }

    // 5. Hide "Preparing" toast and start the actual backup
    await preparingToast.hide();
    preparingToast = undefined; // Ensure it's not hidden again in finally

    await performBackup(gtarPath, sourceDirectory, backupDestination, resolvedArchivePrefix);
  } catch (error) {
    // 6. Handle Errors during preparation or backup
    await preparingToast?.hide().catch(() => {}); // Hide safely if it was still visible

    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error("Backup command failed:", error);

    // Show specific toast for cancellation vs. other failures
    if (message === "Backup cancelled by user.") {
      await showToast({
        style: Toast.Style.Failure, // Or .Success if cancellation is not an error state
        title: "Backup Cancelled",
        message: "The backup process was stopped.",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Backup Failed",
        message: message,
      });
    }
    console.log("--- Backup failed ---");
  } finally {
    // 7. Release Lock (always runs)
    await LocalStorage.removeItem(LOCK_KEY);
    console.log(`Released lock '${LOCK_KEY}'.`);
  }
}
