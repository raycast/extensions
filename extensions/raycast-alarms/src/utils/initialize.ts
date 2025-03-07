import { environment, Cache, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);
const INIT_CACHE_KEY = "alarms-extension-initialized";

/**
 * Check if the extension has already been initialized
 */
const isInitialized = async (): Promise<boolean> => {
  const cache = new Cache();
  return cache.get(INIT_CACHE_KEY) === "true";
};

/**
 * Mark the extension as initialized in the cache
 */
const markAsInitialized = async (): Promise<void> => {
  const cache = new Cache();
  await cache.set(INIT_CACHE_KEY, "true");
};

/**
 * Run the install script to set up the extension
 */
const runInstallScript = async (): Promise<void> => {
  try {
    // Display toast to inform user
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting up Alarms extension...",
      message: "This will only happen once",
    });

    // Get the script path
    const installScriptPath = path.join(environment.assetsPath, "scripts", "install.sh");

    // Make sure the script is executable
    await execAsync(`chmod +x "${installScriptPath}"`);

    // Run the install script
    const { stdout, stderr } = await execAsync(`"${installScriptPath}"`);

    if (stderr) {
      console.error(`Installation error: ${stderr}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "Setup failed",
        message: "Check logs for details",
      });
      return;
    }

    console.log(`Installation output: ${stdout}`);

    // Mark as initialized
    await markAsInitialized();

    // Show success toast
    await loadingToast.hide();
    await showToast({
      style: Toast.Style.Success,
      title: "Alarms extension setup complete",
    });
  } catch (error) {
    console.error("Failed to run install script:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Setup failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Initialize the extension if it hasn't been initialized yet
 */
export const initializeExtension = async (): Promise<void> => {
  // Check if we already initialized
  const initialized = await isInitialized();

  if (!initialized) {
    // Check if install script exists
    const installScriptPath = path.join(environment.assetsPath, "scripts", "install.sh");

    if (fs.existsSync(installScriptPath)) {
      await runInstallScript();
    } else {
      console.error("Install script not found at:", installScriptPath);
      await showToast({
        style: Toast.Style.Failure,
        title: "Setup failed",
        message: "Installation script not found",
      });
    }
  }
};
