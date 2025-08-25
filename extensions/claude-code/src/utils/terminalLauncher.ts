import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

let isExecuting = false;

export type TerminalApp = "terminal" | "iterm2";

/**
 * Validate and normalize preference value
 */
function validateTerminalApp(value: unknown): TerminalApp {
  const validApps: TerminalApp[] = ["terminal", "iterm2"];

  if (typeof value === "string" && validApps.includes(value as TerminalApp)) {
    return value as TerminalApp;
  }

  return "terminal";
}

/**
 * Check if a specific application is installed on the system
 */
async function isAppInstalled(appName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`mdfind "kMDItemKind == 'Application'" | grep -i "${appName}.app" | head -1`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the AppleScript command for different terminal applications
 */
function getTerminalCommand(terminalApp: TerminalApp, command: string): string {
  const escapedCommand = command.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  switch (terminalApp) {
    case "terminal":
      return `osascript -e '
        tell application "Terminal"
          activate
          do script "${escapedCommand}"
        end tell
      '`;

    case "iterm2":
      return `osascript -e '
        tell application "iTerm"
          activate
          create window with default profile
          tell current session of current window
            write text "${escapedCommand}"
          end tell
        end tell
      '`;

    default:
      // Fallback to Terminal.app
      return `osascript -e '
        tell application "Terminal"
          activate
          do script "${escapedCommand}"
        end tell
      '`;
  }
}

/**
 * Get a human-readable name for the terminal app
 */
function getTerminalDisplayName(terminalApp: TerminalApp): string {
  switch (terminalApp) {
    case "terminal":
      return "Terminal";
    case "iterm2":
      return "iTerm2";
    default:
      return "Terminal";
  }
}

/**
 * Validate if the selected app is available
 */
async function validateAppAvailability(terminalApp: TerminalApp): Promise<boolean> {
  switch (terminalApp) {
    case "terminal":
      return true; // Always available on macOS

    case "iterm2":
      return await isAppInstalled("iTerm");

    default:
      return true;
  }
}

/**
 * Execute a command in the user's preferred terminal application
 */
export async function executeInTerminal(command: string): Promise<{ success: boolean; terminalUsed: string }> {
  // Prevent duplicate execution check
  if (isExecuting) {
    return { success: false, terminalUsed: "Blocked (already executing)" };
  }

  isExecuting = true;

  try {
    const preferences = getPreferenceValues<Preferences>();
    let terminalApp = validateTerminalApp(preferences.terminalApp);

    // Validate the selected terminal app is available
    const isAvailable = await validateAppAvailability(terminalApp);

    if (!isAvailable) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Application Not Available",
        message: `${getTerminalDisplayName(terminalApp)} not installed, falling back to Terminal.app`,
      });
      terminalApp = "terminal";
    }

    const terminalCommand = getTerminalCommand(terminalApp, command);
    await execAsync(terminalCommand, { shell: "/bin/bash" });

    return {
      success: true,
      terminalUsed: getTerminalDisplayName(terminalApp),
    };
  } catch (error) {
    console.error("Error executing terminal command:", error);

    // Try fallback to Terminal.app if not already using it
    const preferences = getPreferenceValues<Preferences>();
    if (preferences.terminalApp !== "terminal") {
      try {
        const fallbackCommand = getTerminalCommand("terminal", command);
        console.log("Fallback command:", fallbackCommand);
        await execAsync(fallbackCommand);

        await showToast({
          style: Toast.Style.Animated,
          title: "Fallback Used",
          message: "Used Terminal.app as fallback",
        });

        return {
          success: true,
          terminalUsed: "Terminal (fallback)",
        };
      } catch (fallbackError) {
        console.error("Fallback to Terminal.app also failed:", fallbackError);
      }
    }

    return {
      success: false,
      terminalUsed: "None",
    };
  } finally {
    isExecuting = false;
  }
}

/**
 * Get a manual command string for clipboard copying
 */
export function getManualCommand(command: string): string {
  return command;
}

/**
 * Show success toast with terminal information
 */
export async function showTerminalSuccessToast(terminalUsed: string, context: string) {
  await showToast({
    style: Toast.Style.Success,
    title: "Success!",
    message: `${context} launched in ${terminalUsed}`,
  });
}

/**
 * Show error toast with manual command option
 */
export async function showTerminalErrorToast(command: string, context: string) {
  showFailureToast(new Error(`Could not launch ${context}. Manual command copied to clipboard.`), {
    title: "Launch Failed",
  });
}
