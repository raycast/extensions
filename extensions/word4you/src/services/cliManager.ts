import fs from "fs";
import {
  createEnvironmentFromPreferences,
  ensureVocabularyDirectoryExists,
  getCliFilepath,
  getDownloadUrl,
  getVocabularyPath,
} from "../config";
import { downloadFile, verifyFileHash } from "../utils/downloadUtils";
import { executeCliCommand, executeCliCommandAsync, getAvailableExecutablePath } from "../utils/execUtils";
import { environment } from "@raycast/api";
import path from "path";
import { chmod, mkdir, rm } from "fs/promises";

// Check if word4you CLI is installed
export function isCliInstalled(): boolean {
  const availablePath = getAvailableExecutablePath();
  console.log("Checking for Word4You CLI, found at:", availablePath);
  return availablePath !== null;
}

// Get executable path for the word4you CLI
async function getExecutablePathAsync(): Promise<string> {
  // Check if CLI is already available
  const availablePath = getAvailableExecutablePath();
  if (availablePath) {
    return availablePath;
  }

  console.warn("word4you not found, will download it");

  // If not found, download it
  try {
    return await ensureCLI();
  } catch (error) {
    console.error("Failed to download word4you CLI:", error);
    throw new Error("Could not find or download word4you CLI");
  }
}

// Execute a CLI command with all the common setup steps
export async function executeWordCliCommand(
  args: string[],
  options: {
    onStatusUpdate?: (message: string) => void;
  } = {},
): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    // Get executable path, downloading if necessary
    const executablePath = await getExecutablePathAsync();

    // Use cross-platform path resolution for vocabulary file
    const vocabularyPath = getVocabularyPath();

    // Ensure the directory exists
    ensureVocabularyDirectoryExists(vocabularyPath);

    // Create environment variables from preferences
    const env = createEnvironmentFromPreferences();

    // Execute the command
    const result = await executeCliCommandAsync(executablePath, args, {
      cwd: process.cwd(),
      env: env,
      onStatusUpdate: options.onStatusUpdate,
    });

    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (options.onStatusUpdate) {
      options.onStatusUpdate(`Error: ${errorMessage}`);
    }

    return { success: false, output: "", error: errorMessage };
  }
}

// Execute a synchronous CLI command with all the common setup steps
export async function executeWordCliCommandSync(args: string[]): Promise<string> {
  // Get executable path, downloading if necessary
  const executablePath = await getExecutablePathAsync();

  // Use cross-platform path resolution for vocabulary file
  const vocabularyPath = getVocabularyPath();

  // Ensure the directory exists
  ensureVocabularyDirectoryExists(vocabularyPath);

  // Create environment variables from preferences
  const env = createEnvironmentFromPreferences();

  // Execute the command synchronously
  return executeCliCommand(executablePath, args, {
    cwd: process.cwd(),
    env: env,
  });
}

// Ensure the Word4You CLI is available, downloading it if necessary
export async function ensureCLI(): Promise<string> {
  const cli = getCliFilepath();

  console.log("Ensuring Word4You CLI is available at:", cli);

  // If CLI already exists, return its path
  if (fs.existsSync(cli)) {
    return cli;
  }

  // Get download configuration from config
  const { url: binaryURL, assetName, expectedHash } = getDownloadUrl();

  // Create directories for download and installation
  const binDir = path.dirname(cli);
  const tempDir = path.join(environment.supportPath, ".tmp");

  try {
    // Download the binary
    const downloadedFile = await downloadFile(binaryURL, tempDir, { filename: assetName });

    // Verify hash
    const fileHash = await verifyFileHash(downloadedFile);

    if (fileHash !== expectedHash) {
      throw new Error("Hash verification failed: file hash does not match expected hash");
    }

    // Ensure the bin directory exists
    await mkdir(binDir, { recursive: true });

    // Copy the binary to the final location
    fs.copyFileSync(downloadedFile, cli);

    // Make the binary executable (chmod +x) on Unix-like systems
    await chmod(cli, "755");

    return cli;
  } catch (error) {
    console.error("Error downloading Word4You CLI:", error);
    throw new Error(`Could not download Word4You CLI: ${error}`);
  } finally {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}
