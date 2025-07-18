import { getSelectedFinderItems, getFrontmostApplication } from "@raycast/api";
import { homedir } from "os";
import { dirname } from "path";

/**
 * Utility functions for getting current working directory
 */
export class DirectoryUtils {
  /**
   * Get current directory silently without logging errors
   * This is useful for initialization where we don't want console spam
   */
  static async getCurrentDirectorySilent(): Promise<string> {
    // First check if Finder is frontmost
    try {
      const isFinderFront = await this.isFinderFrontmost();

      if (isFinderFront) {
        try {
          // Try to get selected items from Finder
          const selectedItems = await getSelectedFinderItems();

          if (selectedItems.length > 0) {
            const firstItem = selectedItems[0];
            // If it's a file, get its parent directory
            // If it's a directory, use it directly
            const stat = await import("fs/promises").then((fs) => fs.stat(firstItem.path));
            if (stat.isDirectory()) {
              return firstItem.path;
            } else {
              return dirname(firstItem.path);
            }
          }
        } catch {
          // Silently continue to next option
        }

        try {
          // Try to get Finder's current directory using AppleScript
          const finderPath = await this.getFinderCurrentDirectory();
          if (finderPath) {
            return finderPath;
          }
        } catch {
          // Silently continue to fallback
        }
      }
    } catch {
      // Silently continue to fallback
    }

    // Fallback to home directory
    return homedir();
  }

  /**
   * Get the most appropriate directory to use as root with error logging
   * Priority: Selected Finder items > Finder current directory > Home directory
   */
  static async getCurrentDirectory(): Promise<string> {
    // First check if Finder is frontmost
    const isFinderFront = await this.isFinderFrontmost();

    if (isFinderFront) {
      try {
        // Try to get selected items from Finder
        const selectedItems = await getSelectedFinderItems();

        if (selectedItems.length > 0) {
          const firstItem = selectedItems[0];
          // If it's a file, get its parent directory
          // If it's a directory, use it directly
          const stat = await import("fs/promises").then((fs) => fs.stat(firstItem.path));
          if (stat.isDirectory()) {
            return firstItem.path;
          } else {
            return dirname(firstItem.path);
          }
        }
      } catch (error) {
        // If no items are selected, continue to try getting Finder's current directory
        console.log("No Finder items selected:", error);
      }

      try {
        // Try to get Finder's current directory using AppleScript
        const finderPath = await this.getFinderCurrentDirectory();
        if (finderPath) {
          return finderPath;
        }
      } catch (error) {
        console.log("Could not get Finder current directory:", error);
      }
    }

    // Fallback to home directory
    return homedir();
  }

  /**
   * Get Finder's current directory using AppleScript
   */
  private static async getFinderCurrentDirectory(): Promise<string | null> {
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      const script = `
        tell application "Finder"
          if (count of Finder windows) > 0 then
            set currentFolder to (target of front Finder window as alias)
            return POSIX path of currentFolder
          else
            return POSIX path of (path to desktop folder)
          end if
        end tell
      `;

      const { stdout } = await execAsync(`osascript -e '${script}'`);
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Get selected Finder items paths
   */
  static async getSelectedPaths(): Promise<string[]> {
    try {
      const selectedItems = await getSelectedFinderItems();
      return selectedItems.map((item) => item.path);
    } catch {
      return [];
    }
  }

  /**
   * Check if Finder is the frontmost application
   */
  static async isFinderFrontmost(): Promise<boolean> {
    try {
      const frontmostApp = await getFrontmostApplication();
      return frontmostApp.bundleId === "com.apple.finder";
    } catch {
      return false;
    }
  }

  /**
   * Format path for display (show home directory as ~)
   */
  static formatPathForDisplay(path: string): string {
    const home = homedir();
    if (path.startsWith(home)) {
      return path.replace(home, "~");
    }
    return path;
  }
}
