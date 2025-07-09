import { existsSync } from "fs";
import { execSync } from "child_process";
import { showToast, Toast, open } from "@raycast/api";
import { IPATOOL_PATH } from "./paths";
import { logger } from "./logger";

/**
 * Validates that ipatool is installed and accessible
 * @returns Promise<boolean> - true if ipatool is available, false otherwise
 */
export async function validateIpatoolInstallation(): Promise<boolean> {
  try {
    // First check if the file exists at the expected path
    if (!existsSync(IPATOOL_PATH)) {
      await showIpatoolNotFoundError();
      return false;
    }

    // Try to execute ipatool to verify it works
    try {
      execSync(`"${IPATOOL_PATH}" --version`, { timeout: 5000 });
      logger.log(`[ipatool] Found working ipatool at: ${IPATOOL_PATH}`);
      return true;
    } catch (execError) {
      await showIpatoolExecutionError(execError);
      return false;
    }
  } catch (error) {
    logger.error("[ipatool] Validation error:", error);
    await showGenericIpatoolError(error);
    return false;
  }
}

/**
 * Shows error when ipatool is not found at expected path
 */
async function showIpatoolNotFoundError(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "ipatool not found",
    message: `Not found at: ${IPATOOL_PATH}`,
    primaryAction: {
      title: "Install ipatool",
      onAction: () => {
        open("https://github.com/majd/ipatool");
      },
    },
    secondaryAction: {
      title: "Check Installation",
      onAction: () => {
        showInstallationInstructions();
      },
    },
  });

  logger.error(`[ipatool] Not found at expected path: ${IPATOOL_PATH}`);
}

/**
 * Shows error when ipatool exists but can't be executed
 */
async function showIpatoolExecutionError(error: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "ipatool execution failed",
    message: "Found but cannot execute",
    primaryAction: {
      title: "Check Permissions",
      onAction: () => {
        showPermissionInstructions();
      },
    },
  });

  logger.error(`[ipatool] Execution failed:`, error);
}

/**
 * Shows generic ipatool error
 */
async function showGenericIpatoolError(error: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "ipatool validation failed",
    message: error instanceof Error ? error.message : "Unknown error",
  });
}

/**
 * Shows installation instructions
 */
async function showInstallationInstructions(): Promise<void> {
  const instructions = `
# Install ipatool using Homebrew (recommended):
brew install ipatool

# Alternative: Manual installation
# 1. Download from: https://github.com/majd/ipatool/releases
# 2. Place in /opt/homebrew/bin/ (Apple Silicon) or /usr/local/bin/ (Intel)
# 3. Make executable: chmod +x /path/to/ipatool

# Current expected path: ${IPATOOL_PATH}
  `.trim();

  await showToast({
    style: Toast.Style.Failure,
    title: "Installation Instructions",
    message: "Check console for details",
  });

  console.log("[ipatool] Installation Instructions:");
  console.log(instructions);
}

/**
 * Shows permission fix instructions
 */
async function showPermissionInstructions(): Promise<void> {
  const instructions = `
# Fix ipatool permissions:
chmod +x "${IPATOOL_PATH}"

# If still not working, try:
sudo chmod +x "${IPATOOL_PATH}"

# Or reinstall with Homebrew:
brew uninstall ipatool
brew install ipatool
  `.trim();

  await showToast({
    style: Toast.Style.Failure,
    title: "Permission Fix Instructions",
    message: "Check console for details",
  });

  console.log("[ipatool] Permission Fix Instructions:");
  console.log(instructions);
}

/**
 * Attempts to find ipatool in common locations
 * @returns string | null - path to ipatool if found, null otherwise
 */
export function findIpatoolPath(): string | null {
  const commonPaths = [
    "/opt/homebrew/bin/ipatool", // Homebrew on Apple Silicon
    "/usr/local/bin/ipatool",    // Homebrew on Intel
    "/usr/bin/ipatool",          // System installation
    `${process.env.HOME}/.local/bin/ipatool`, // User local installation
    `${process.env.HOME}/bin/ipatool`,        // User bin directory
  ];

  for (const path of commonPaths) {
    if (existsSync(path)) {
      try {
        execSync(`"${path}" --version`, { timeout: 5000 });
        logger.log(`[ipatool] Found working ipatool at: ${path}`);
        return path;
      } catch {
        logger.log(`[ipatool] Found but non-functional ipatool at: ${path}`);
      }
    }
  }

  // Try to find in PATH
  try {
    execSync("which ipatool", { timeout: 5000 });
    const pathResult = execSync("which ipatool", { encoding: "utf8", timeout: 5000 }).trim();
    if (pathResult && existsSync(pathResult)) {
      logger.log(`[ipatool] Found ipatool in PATH: ${pathResult}`);
      return pathResult;
    }
  } catch {
    // ipatool not in PATH
  }

  return null;
}
