import { LocalStorage, Toast, showToast, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

// Define the preference types
interface WinePreferences {
  winePath: string;
}

const execPromise = promisify(exec);

/**
 * Detects the path to the Wine binary.
 *
 * Order of preference:
 * 1. User preference from extension settings
 * 2. Previously detected path from LocalStorage
 * 3. Path detected from user's shell
 * 4. Fallback to "wine" (assuming it's in PATH)
 */
export async function detectWinePath(): Promise<string> {
  try {
    // 1. Use the user's preference from extension settings
    const { winePath: prefWinePath } = getPreferenceValues<WinePreferences>();
    if (prefWinePath && prefWinePath.trim()) {
      return prefWinePath.trim();
    }

    // 2. Check LocalStorage for a previously detected path
    const stored = await LocalStorage.getItem<string>("detectedWinePath");
    if (stored) {
      return stored;
    }

    // 3. Detect from user's shell
    return await detectWineFromShell();
  } catch (error) {
    console.error("Error detecting Wine path:", error);
    // Fallback to "wine" assuming it's in PATH
    return "wine";
  }
}

/**
 * Attempts to detect Wine binary path from user's shell
 */
async function detectWineFromShell(): Promise<string> {
  try {
    const { stdout } = await execPromise(`$SHELL -i -c 'which wine'`);
    const winePath = stdout?.trim();

    if (winePath) {
      // Store the detected path for future use
      await LocalStorage.setItem("detectedWinePath", winePath);
      await showToast({
        style: Toast.Style.Success,
        title: "Wine Detected",
        message: winePath,
      });
      return winePath;
    }
  } catch (error) {
    console.error("Failed to detect Wine from shell:", error);
  }

  // Fallback to "wine" if not found
  return "wine";
}
