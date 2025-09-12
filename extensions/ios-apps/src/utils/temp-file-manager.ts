import fs from "fs";
import path from "path";
import { logger } from "./logger";
import { getConfig } from "../config";

/**
 * Global array to track all temporary files created during the application lifecycle
 */
let tempFiles: string[] = [];
let exitHandlerRegistered = false;

/**
 * Registers a temporary file path for tracking and cleanup
 * @param filePath - The path to the temporary file to track
 */
export function registerTempFile(filePath: string): void {
  if (!tempFiles.includes(filePath)) {
    tempFiles.push(filePath);
    logger.log(`[TempFileManager] Registered temp file: ${filePath}`);
  }

  // Register the exit handler on first use
  if (!exitHandlerRegistered) {
    registerExitHandler();
    exitHandlerRegistered = true;
  }
}

/**
 * Unregisters a temporary file from tracking (useful when file is no longer temporary)
 * @param filePath - The path to the temporary file to unregister
 */
export function unregisterTempFile(filePath: string): void {
  const index = tempFiles.indexOf(filePath);
  if (index > -1) {
    tempFiles.splice(index, 1);
    logger.log(`[TempFileManager] Unregistered temp file: ${filePath}`);
  }
}

/**
 * Cleans up all registered temporary files
 * Swallows fs errors but logs them via logger.error
 */
export function cleanupTempFiles(): void {
  logger.log(`[TempFileManager] Starting cleanup of ${tempFiles.length} temp files`);

  for (const filePath of tempFiles) {
    try {
      // Check if file exists before attempting to delete
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.log(`[TempFileManager] Successfully deleted temp file: ${filePath}`);
      } else {
        logger.log(`[TempFileManager] Temp file already deleted or does not exist: ${filePath}`);
      }
    } catch (error) {
      // Swallow fs errors but log them
      logger.error(`[TempFileManager] Error deleting temp file ${filePath}:`, error);
    }
  }

  // Clear the array after cleanup attempt
  tempFiles = [];
  logger.log(`[TempFileManager] Temp file cleanup completed`);
}

/**
 * Cleans up specific temporary files matching patterns (.partial, .ipa, *.tmp)
 * @param directory - Directory to search for temp files (optional, uses tempFiles if not provided)
 */
export function cleanupTempFilesByPattern(directory?: string): void {
  if (directory) {
    logger.log(`[TempFileManager] Cleaning up temp files by pattern in directory: ${directory}`);

    try {
      const files = fs.readdirSync(directory);
      const tempPatterns = [".partial", ".tmp"];
      const ipaPartialPattern = /\.ipa\.partial$/;

      for (const file of files) {
        const filePath = path.join(directory, file);
        const shouldDelete =
          tempPatterns.some((pattern) => file.endsWith(pattern)) ||
          ipaPartialPattern.test(file) ||
          file.endsWith(".tmp");

        if (shouldDelete) {
          try {
            fs.unlinkSync(filePath);
            logger.log(`[TempFileManager] Deleted pattern-matched temp file: ${filePath}`);
          } catch (error) {
            logger.error(`[TempFileManager] Error deleting pattern-matched temp file ${filePath}:`, error);
          }
        }
      }
    } catch (error) {
      logger.error(`[TempFileManager] Error reading directory ${directory} for temp file cleanup:`, error);
    }
  } else {
    // Use registered temp files
    cleanupTempFiles();
  }
}

/**
 * Handles cleanup on process rejection, timeout, or error
 * @param error - The error that triggered the cleanup
 * @param context - Context information about where the error occurred
 */
export function handleProcessErrorCleanup(error: Error, context: string): void {
  logger.error(`[TempFileManager] Process error in ${context}, performing cleanup:`, error);
  cleanupTempFiles();
}

/**
 * Registers process exit handlers for last-chance cleanup
 * Respects the tempCleanupOnExit configuration flag
 */
function registerExitHandler(): void {
  const performExitCleanup = () => {
    const config = getConfig();

    if (config.tempCleanupOnExit && tempFiles.length > 0) {
      logger.log(`[TempFileManager] Process exit detected, performing last-chance cleanup (${tempFiles.length} files)`);
      cleanupTempFiles();
    } else if (!config.tempCleanupOnExit) {
      logger.log(`[TempFileManager] Process exit detected, but tempCleanupOnExit is disabled`);
    }
  };

  // Register exit handler
  process.on("exit", (code) => {
    logger.log(`[TempFileManager] Process exiting with code ${code}`);
    performExitCleanup();
  });

  // Handle other termination signals
  process.on("SIGINT", () => {
    logger.log(`[TempFileManager] Received SIGINT`);
    performExitCleanup();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.log(`[TempFileManager] Received SIGTERM`);
    performExitCleanup();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.error(`[TempFileManager] Uncaught exception:`, error);
    performExitCleanup();
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    logger.error(`[TempFileManager] Unhandled rejection at:`, promise, "reason:", reason);
    performExitCleanup();
    process.exit(1);
  });

  logger.log(`[TempFileManager] Exit handlers registered`);
}

/**
 * Gets the current list of tracked temporary files (for debugging)
 */
export function getTrackedTempFiles(): readonly string[] {
  return [...tempFiles];
}

/**
 * Clears all tracked temporary files without deleting them (for testing)
 */
export function clearTempFileTracking(): void {
  tempFiles = [];
  logger.log(`[TempFileManager] Cleared temp file tracking`);
}
