import { getPreferenceValues, showToast, Toast, LocalStorage, showHUD } from "@raycast/api";
import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// --- Configuration Constants ---
const LOCK_KEY = "cleanupLock"; // LocalStorage key for cleanup concurrency

// --- Preferences Interface ---
interface Preferences {
  sourceDirectory: string; // Needed for default prefix calculation
  backupDestination: string;
  archivePrefix?: string;
  retentionDays?: string;
  moveToTrash?: boolean;
}

// --- Utility Functions ---

/**
 * Resolves paths starting with '~/' to the user's home directory.
 * @param inputPath The path string to resolve.
 * @returns The resolved absolute path.
 */
function resolvePath(inputPath: string): string {
  // Use optional chaining for safety, although inputs are validated later
  if (inputPath?.startsWith("~" + path.sep)) {
    return path.join(os.homedir(), inputPath.slice(1));
  }
  return inputPath;
}

/**
 * Parses a timestamp string in 'YYYYMMDD_HHMMSS' format into a Date object.
 * Performs validation to ensure the resulting Date object matches the input components.
 * @param timestampStr The timestamp string to parse.
 * @returns A Date object if parsing and validation succeed, otherwise null.
 */
function parseTimestamp(timestampStr: string): Date | null {
  const match = timestampStr.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  // Month is 0-indexed in Date constructor
  const date = new Date(year, month - 1, day, hour, minute, second);
  // Validate the parsed date components against the Date object's values
  if (
    isNaN(date.getTime()) || // Check if Date object is valid
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return null; // Return null if any component mismatch (e.g., invalid date like Feb 30)
  }
  return date;
}

/**
 * Moves a file to the system trash (macOS `.Trash`) using the native 'mv' command.
 * Handles potential filename collisions in the Trash directory by appending a counter.
 * @param filePath The absolute path to the file to trash.
 * @throws Error if the 'mv' command fails.
 */
async function moveToTrashUsingMV(filePath: string): Promise<void> {
  const trashPath = path.join(os.homedir(), ".Trash");
  const baseName = path.basename(filePath);
  let destinationPath = path.join(trashPath, baseName); // Initial target path in Trash

  // Check for existing file in Trash and append counter if needed
  let counter = 0;
  while (fs.existsSync(destinationPath)) {
    counter++;
    const ext = path.extname(baseName);
    const nameWithoutExt = baseName.substring(0, baseName.length - ext.length);
    // Append counter like "filename 1.txt", "filename 2.txt" etc.
    destinationPath = path.join(trashPath, `${nameWithoutExt} ${counter}${ext}`);
  }

  console.log(`Using 'mv' to move to Trash: ${path.basename(filePath)} -> ${path.basename(destinationPath)}`);

  return new Promise((resolve, reject) => {
    const child = spawn("mv", [filePath, destinationPath], { stdio: "pipe" }); // Pipe stdio to capture errors
    let stderrOutput = "";

    child.stderr?.on("data", (data) => {
      stderrOutput += data.toString();
    });

    child.on("error", (spawnError) => {
      console.error(`Spawn error for 'mv' command on ${path.basename(filePath)}:`, spawnError);
      reject(new Error(`Failed to start 'mv' process: ${spawnError.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(); // Command succeeded
      } else {
        const errorMsg = `'mv' command failed with exit code ${code} for ${path.basename(filePath)}. ${stderrOutput ? `Stderr: ${stderrOutput.trim()}` : ""}`;
        console.error(errorMsg);
        reject(new Error(errorMsg));
      }
    });
  });
}

// --- Raycast Command Export for Cleanup ---

export default async function cleanupCommand() {
  console.log(`~~~ Cleanup Command Started - ${new Date().toISOString()} ~~~`);
  let lockAcquired = false;
  let currentToast: Toast | undefined;

  try {
    // --- 1. Concurrency Check & Lock Acquisition ---
    if (await LocalStorage.getItem(LOCK_KEY)) {
      console.warn(`Concurrency lock '${LOCK_KEY}' found.`);
      await showHUD("Cleanup Already in Progress");
      return;
    }
    await LocalStorage.setItem(LOCK_KEY, new Date().toISOString());
    lockAcquired = true;
    console.log(`Acquired cleanup lock '${LOCK_KEY}'.`);

    // --- 2. Get and Resolve Preferences ---
    const prefs = getPreferenceValues<Preferences>();
    if (!prefs.backupDestination) throw new Error("Backup destination directory preference is missing.");
    if (!prefs.sourceDirectory && !prefs.archivePrefix)
      throw new Error("Source directory preference is required to determine the default archive prefix.");

    const backupDestination = resolvePath(prefs.backupDestination);
    const sourceDirectory = prefs.sourceDirectory ? resolvePath(prefs.sourceDirectory) : ""; // Resolve only if needed
    const shouldMoveToTrash = prefs.moveToTrash ?? true; // Default to moving to trash

    let resolvedArchivePrefix = prefs.archivePrefix?.trim();
    if (!resolvedArchivePrefix) {
      if (!sourceDirectory) throw new Error("Cannot determine default prefix without source directory.");
      resolvedArchivePrefix = path.basename(sourceDirectory) + "_";
      console.log(`Using default archive prefix derived from source: ${resolvedArchivePrefix}`);
    }

    const retentionDaysStr = prefs.retentionDays?.trim() || "0";
    const retentionDays = parseInt(retentionDaysStr, 10);

    // --- 3. Handle Disabled Cleanup ---
    if (isNaN(retentionDays) || retentionDays <= 0) {
      console.log(`Cleanup disabled (Retention <= 0 days).`);
      await showHUD("Cleanup Disabled");
      return; // Exit early, finally will release lock
    }

    // --- 4. Check Backup Directory ---
    if (!fs.existsSync(backupDestination) || !fs.statSync(backupDestination).isDirectory()) {
      throw new Error(`Backup destination directory not found or invalid: ${backupDestination}`);
    }
    console.log(
      `Config: Retention=${retentionDays}d, Dest=${path.basename(backupDestination)}, Prefix=${resolvedArchivePrefix}, Trash=${shouldMoveToTrash}`,
    );

    // --- 5. Calculate Cutoff Timestamp ---
    const now = Date.now();
    const cutoffTimestamp = now - retentionDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(cutoffTimestamp);
    console.log(`Cutoff date: ${cutoffDate.toISOString()} (older files will be processed)`);

    // --- 6. Start Progress Toast ---
    currentToast = await showToast({
      style: Toast.Style.Animated,
      title: `Cleaning Backups...`,
      message: `Checking files older than ${retentionDays} days...`,
    });

    // --- 7. Find Files to Delete/Trash ---
    const filesToDelete: { path: string; date: Date }[] = [];
    let filesProcessed = 0;
    let errorsProcessing = 0;

    console.log("Reading backup directory...");
    const entries = fs.readdirSync(backupDestination);
    console.log(`Found ${entries.length} entries.`);

    for (const entry of entries) {
      const fullPath = path.join(backupDestination, entry);
      try {
        // Ensure it's a file before proceeding
        const stats = fs.statSync(fullPath);
        if (!stats.isFile()) continue;

        // Check if filename matches pattern and parse date
        if (entry.startsWith(resolvedArchivePrefix) && entry.endsWith(".tar.gz")) {
          const timestampPart = entry.substring(resolvedArchivePrefix.length, entry.length - ".tar.gz".length);
          const fileDate = parseTimestamp(timestampPart);

          if (fileDate) {
            // Check if file date is older than cutoff
            if (fileDate.getTime() < cutoffTimestamp) {
              filesToDelete.push({ path: fullPath, date: fileDate });
            }
          } else {
            console.warn(`Could not parse timestamp from filename: ${entry}`);
          }
        }
      } catch (statError) {
        console.warn(
          `Could not stat file ${path.basename(fullPath)}: ${statError instanceof Error ? statError.message : statError}`,
        );
      }
    }
    console.log(`Found ${filesToDelete.length} backups older than ${retentionDays} days.`);

    // --- 8. Process Files (Delete or Trash) ---
    if (filesToDelete.length > 0) {
      const actionVerb = shouldMoveToTrash ? "Moving to Trash" : "Deleting";
      currentToast.message = `${actionVerb} ${filesToDelete.length} old backup file${filesToDelete.length === 1 ? "" : "s"}...`;
      filesToDelete.sort((a, b) => a.date.getTime() - b.date.getTime()); // Process oldest first

      for (const fileInfo of filesToDelete) {
        const baseName = path.basename(fileInfo.path);
        try {
          if (shouldMoveToTrash) {
            await moveToTrashUsingMV(fileInfo.path);
          } else {
            console.log(`Permanently deleting: ${baseName}`);
            fs.unlinkSync(fileInfo.path);
          }
          filesProcessed++;
        } catch (err) {
          errorsProcessing++;
          const errorAction = shouldMoveToTrash ? "TRASH VIA MV" : "DELETE";
          console.error(`!!! FAILED TO ${errorAction}: ${baseName} !!!`);
          console.error("!!! Error Details:", err); // Log the full error
        }
      } // End processing loop
    }

    // --- 9. Show Final Result Toast ---
    await currentToast.hide(); // Hide progress toast first
    const pastTenseAction = shouldMoveToTrash ? "Moved to Trash" : "Deleted";
    let finalMessage = "";

    if (filesProcessed === filesToDelete.length && filesProcessed > 0) {
      finalMessage = `${pastTenseAction} ${filesProcessed} old backup file${filesProcessed === 1 ? "" : "s"}.`;
    } else if (filesToDelete.length > 0 && errorsProcessing === filesToDelete.length) {
      finalMessage = `Found ${filesToDelete.length} old file${filesToDelete.length === 1 ? "" : "s"}, but failed to process any. Check logs.`;
    } else if (filesToDelete.length > 0) {
      // Partial success
      finalMessage = `${pastTenseAction} ${filesProcessed} of ${filesToDelete.length} old file${filesToDelete.length === 1 ? "" : "s"} found.`;
    } else {
      finalMessage = "No old backup files found matching criteria.";
    }

    if (errorsProcessing > 0 && filesProcessed < filesToDelete.length) {
      // Add failure info if relevant and not already covered
      const errorVerb = shouldMoveToTrash ? "trash" : "delete";
      finalMessage += ` Failed to ${errorVerb} ${errorsProcessing} file${errorsProcessing === 1 ? "" : "s"}. See logs for details.`;
    }

    await showToast({
      style: errorsProcessing > 0 ? Toast.Style.Failure : Toast.Style.Success,
      title: "Cleanup Complete",
      message: finalMessage,
    });
    console.log("--- Cleanup process finished ---");
  } catch (error) {
    // --- 10. Handle Critical Errors ---
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error(`!!! Cleanup Command Failed Critically: ${new Date().toISOString()} !!!`);
    console.error("!!! Error:", error); // Log the full error object for stack trace etc.
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

    await currentToast?.hide().catch((toastHideError) => {
      console.error("!!! Error hiding toast during critical failure handling:", toastHideError);
    });

    await showToast({
      style: Toast.Style.Failure,
      title: "Cleanup Failed (Check Logs)",
      // Truncate message for toast if necessary
      message: `Error: ${message.length > 150 ? message.substring(0, 147) + "..." : message}`,
    }).catch((toastError) => {
      console.error("!!! Failed to show final failure toast:", toastError);
    });
    console.log("--- Cleanup failed critically ---");
  } finally {
    // --- 11. Release Lock ---
    if (lockAcquired) {
      try {
        await LocalStorage.removeItem(LOCK_KEY);
        console.log(`Released cleanup lock '${LOCK_KEY}'.`);
      } catch (removeLockError) {
        console.error("!!! CRITICAL: Failed to remove cleanup lock !!!");
        console.error("Lock Removal Error:", removeLockError);
        // Consider notifying user differently if lock isn't released?
      }
    } else {
      console.log("Cleanup lock was not acquired, skipping removal.");
    }
    console.log(`~~~ Cleanup Command Ended - ${new Date().toISOString()} ~~~`);
  }
}
