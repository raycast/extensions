import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ShortcutData {
  timestamp: string;
  amount: number;
  note?: string;
  totalToday: number;
  goal: number;
}

/**
 * Trigger Apple Shortcuts with water log data
 * The shortcut will receive a JSON string with water intake information
 */
export async function triggerAppleShortcut(
  shortcutName: string,
  data: ShortcutData,
): Promise<void> {
  if (!shortcutName || shortcutName.trim() === "") {
    return; // Shortcuts integration is disabled
  }

  try {
    // Create JSON input for the shortcut
    const jsonInput = JSON.stringify(data);

    // Use the 'shortcuts' command line tool to run the shortcut
    // Pass data as input via stdin
    const command = `echo '${jsonInput}' | shortcuts run "${shortcutName}"`;

    await execAsync(command);
    console.log(`Successfully triggered shortcut: ${shortcutName}`);
  } catch (error) {
    console.error("Failed to trigger Apple Shortcut:", error);
    // Don't throw - we don't want to fail the log operation if shortcuts fail
  }
}

/**
 * Check if a shortcut exists
 */
export async function checkShortcutExists(
  shortcutName: string,
): Promise<boolean> {
  if (!shortcutName || shortcutName.trim() === "") {
    return false;
  }

  try {
    const { stdout } = await execAsync("shortcuts list");
    return stdout.includes(shortcutName);
  } catch (error) {
    console.error("Failed to list shortcuts:", error);
    return false;
  }
}
