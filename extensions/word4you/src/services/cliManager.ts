import fs from "fs";
import {
  CLI_CONFIG,
  createEnvironmentFromPreferences,
  ensureVocabularyDirectoryExists,
  getCliFilepath,
  getDownloadUrl,
  getVocabularyPath,
} from "../config";
import { downloadFile, verifyFileHash } from "../utils/downloadUtils";
import { executeCliCommand, executeCliWithStatusUpdate } from "../utils/execUtils";
import { environment } from "@raycast/api";
import path from "path";
import { chmod, mkdir, rm } from "fs/promises";

// Check if word4you CLI is installed with correct version
export async function isRequiredCliInstalled(): Promise<boolean> {
  const executablePath = getCliFilepath();

  if (!fs.existsSync(executablePath)) {
    return false;
  }

  return await checkCliVersion(executablePath);
}

// Execute a CLI command with all the common setup steps
export async function executeWordCliWithStatusUpdate(
  args: string[],
  options: {
    onStatusUpdate?: (message: string) => void;
  } = {},
): Promise<boolean> {
  try {
    // Get executable path, downloading if necessary
    const executablePath = getCliFilepath();

    // Use cross-platform path resolution for vocabulary file
    const vocabularyPath = getVocabularyPath();

    // Ensure the directory exists
    ensureVocabularyDirectoryExists(vocabularyPath);

    // Create environment variables from preferences
    const env = createEnvironmentFromPreferences();

    // Execute the command
    return await executeCliWithStatusUpdate(executablePath, args, {
      cwd: process.cwd(),
      env: env,
      onStatusUpdate: options.onStatusUpdate,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (options.onStatusUpdate) {
      options.onStatusUpdate(`Error: ${errorMessage}`);
    }

    return false;
  }
}

// Execute a synchronous CLI command with all the common setup steps
export async function executeWordCli(args: string[]): Promise<string> {
  // Get executable path, downloading if necessary
  const executablePath = getCliFilepath();

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

// Check if the CLI version matches the expected version
async function checkCliVersion(cliPath: string): Promise<boolean> {
  try {
    const result = executeCliCommand(cliPath, ["--version"], {
      cwd: process.cwd(),
      env: process.env,
    });

    // Extract version from output (e.g., "word4you 1.0.0" -> "1.0.0")
    const versionMatch = result.match(/word4you\s+(\d+\.\d+\.\d+)/i);
    if (!versionMatch) {
      console.warn("Could not parse CLI version from output:", result);
      return false;
    }

    const installedVersion = versionMatch[1];
    const expectedVersion = CLI_CONFIG.version.replace(/^v/, ""); // Remove 'v' prefix if present

    return installedVersion === expectedVersion;
  } catch (error) {
    console.error("Error checking CLI version:", error);
    return false;
  }
}

// Ensure the Word4You CLI is available, downloading it if necessary
export async function ensureCLI(): Promise<string> {
  const cli = getCliFilepath();

  // If CLI already exists, check its version
  if (fs.existsSync(cli)) {
    const isVersionCorrect = await checkCliVersion(cli);
    if (isVersionCorrect) {
      console.log("CLI exists and version is correct");
      return cli;
    } else {
      console.log("CLI exists but version is incorrect, will re-download");
      // Remove the old CLI so it gets re-downloaded
      try {
        fs.unlinkSync(cli);
      } catch (error) {
        console.warn("Could not remove old CLI:", error);
      }
    }
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
