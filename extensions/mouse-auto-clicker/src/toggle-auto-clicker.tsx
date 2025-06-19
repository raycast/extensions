import {
  showToast,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  showHUD,
} from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Preferences {
  clickInterval: string;
}

interface ClickerState {
  isRunning: boolean;
  intervalId: NodeJS.Timeout | null;
}

const clickerState: ClickerState = {
  isRunning: false,
  intervalId: null,
};

const cleanup = () => {
  if (clickerState.intervalId) {
    clearInterval(clickerState.intervalId);
    clickerState.intervalId = null;
  }
  clickerState.isRunning = false;
};

// Mouse position state
let mouseX = 500;
let mouseY = 400;

/**
 * Check if a file exists at the given path
 */
const fileExists = async (path: string): Promise<boolean> => {
  try {
    await execAsync(`test -f "${path}"`);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if Homebrew is installed using absolute paths
 */
const isBrewInstalled = async (): Promise<boolean> => {
  // Check common Homebrew installation paths
  const brewPaths = [
    "/opt/homebrew/bin/brew", // Apple Silicon Macs
    "/usr/local/bin/brew", // Intel Macs
  ];

  for (const path of brewPaths) {
    if (await fileExists(path)) {
      return true;
    }
  }
  return false;
};

/**
 * Check if cliclick is installed using absolute paths
 */
const isCliclickInstalled = async (): Promise<boolean> => {
  // Check common cliclick installation paths (same directories as Homebrew)
  const cliclickPaths = [
    "/opt/homebrew/bin/cliclick", // Apple Silicon Macs
    "/usr/local/bin/cliclick", // Intel Macs
  ];

  for (const path of cliclickPaths) {
    if (await fileExists(path)) {
      return true;
    }
  }
  return false;
};

/**
 * Get the absolute path to cliclick
 */
const getCliclickPath = async (): Promise<string | null> => {
  const cliclickPaths = [
    "/opt/homebrew/bin/cliclick", // Apple Silicon Macs
    "/usr/local/bin/cliclick", // Intel Macs
  ];

  for (const path of cliclickPaths) {
    if (await fileExists(path)) {
      return path;
    }
  }
  return null;
};

const getMousePosition = async (): Promise<{ x: number; y: number }> => {
  try {
    if (process.platform === "darwin") {
      const cliclickPath = await getCliclickPath();
      if (cliclickPath) {
        // macOS: Use cliclick to get mouse position
        const result = await execAsync(`"${cliclickPath}" p`);

        if (result.stdout) {
          const coords = result.stdout.trim().split(",");
          if (coords.length === 2) {
            return {
              x: parseInt(coords[0]),
              y: parseInt(coords[1]),
            };
          }
        }
      }
    }
  } catch (error) {
    // Fallback to stored position
  }

  return { x: mouseX, y: mouseY };
};

const performMouseClick = async (x: number, y: number): Promise<void> => {
  if (process.platform === "darwin") {
    const cliclickPath = await getCliclickPath();
    if (cliclickPath) {
      // macOS: Use cliclick to perform mouse click
      await execAsync(`"${cliclickPath}" c:${x},${y}`);
    }
  }
};

const performClick = async () => {
  try {
    // Get current mouse position
    const position = await getMousePosition();

    // Update stored position
    mouseX = position.x;
    mouseY = position.y;

    // Perform the click
    await performMouseClick(position.x, position.y);

    console.log(`Clicked at ${position.x}, ${position.y}`);
  } catch (error) {
    console.error("Error during auto-click:", error);
    cleanup();
  }
};

const startAutoClicker = (interval: number) => {
  if (clickerState.isRunning) {
    return;
  }

  clickerState.isRunning = true;
  clickerState.intervalId = setInterval(() => {
    performClick();
  }, interval);
};

const stopAutoClicker = () => {
  cleanup();
};

export default async function Command() {
  try {
    // Check if required dependencies are installed
    const [brewInstalled, cliclickInstalled] = await Promise.all([
      isBrewInstalled(),
      isCliclickInstalled(),
    ]);

    // If dependencies are missing, show installation instructions
    if (!brewInstalled || !cliclickInstalled) {
      const missingDeps = [];
      if (!brewInstalled) missingDeps.push("Homebrew");
      if (!cliclickInstalled) missingDeps.push("cliclick");

      await showToast({
        style: Toast.Style.Failure,
        title: `${missingDeps.join(" and ")} Required`,
        message: "Setup needed for mouse auto-clicker",
        primaryAction: {
          title: "Copy Install Commands",
          onAction: async () => {
            const commands = !brewInstalled
              ? '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" && brew install cliclick'
              : "brew install cliclick";

            await showToast({
              style: Toast.Style.Success,
              title: "Commands Copied",
              message: "Paste in Terminal to install",
            });

            // Copy to clipboard
            await execAsync(`echo '${commands}' | pbcopy`);
          },
        },
        secondaryAction: {
          title: "View Instructions",
          onAction: async () => {
            await showHUD(`
Installation Instructions:

1. Install Homebrew (if needed):
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

2. Install cliclick:
brew install cliclick

3. Restart this command after installation
            `);
          },
        },
      });

      return;
    }

    // Dependencies are installed, proceed with auto-clicker logic
    const preferences = getPreferenceValues<Preferences>();
    const clickInterval = parseInt(preferences.clickInterval) || 100; // Default to 100ms

    if (clickerState.isRunning) {
      // Stop the auto clicker
      stopAutoClicker();

      await showToast({
        style: Toast.Style.Success,
        title: "Auto Clicker Stopped",
        message: "Mouse auto-clicker has been turned off",
      });
      await showHUD("🛑 Auto Clicker Stopped");
    } else {
      // Start the auto clicker
      startAutoClicker(clickInterval);

      await showToast({
        style: Toast.Style.Success,
        title: "Auto Clicker Started",
        message: `Clicking every ${clickInterval}ms. Run command again to stop.`,
      });
      await showHUD(`🖱️ Auto Clicker Started (${clickInterval}ms interval)`);
    }

    // Handle cleanup when extension is deactivated
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("exit", cleanup);

    // Handle system sleep/wake events (macOS specific)
    if (process.platform === "darwin") {
      // Add process listeners for cleanup
      const handleSystemEvent = () => {
        if (clickerState.isRunning) {
          cleanup();
        }
      };

      // Listen for various system events that should stop the auto-clicker
      process.on("SIGTERM", handleSystemEvent);
      process.on("SIGINT", handleSystemEvent);
    }

    // Close main window
    try {
      await closeMainWindow();
    } catch (error) {
      // Window operations may not be available in background mode
    }
  } catch (error) {
    console.error("Error in auto clicker command:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Auto Clicker Error",
      message:
        "Failed to toggle auto clicker. Check accessibility permissions.",
    });
  }
}
