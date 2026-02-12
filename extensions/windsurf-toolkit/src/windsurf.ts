import { execFile } from "child_process";
import { promisify } from "util";
import { showToast, Toast } from "@raycast/api";

const execFileAsync = promisify(execFile);

/**
 * Opens a project in Windsurf
 * Tries multiple fallback methods:
 * 1. URL scheme: windsurf://file/{path}
 * 2. CLI command: windsurf {path}
 * 3. macOS open command: open -a Windsurf {path}
 */
export async function openProjectInWindsurf(
  projectPath: string,
  closeOthers = false
): Promise<void> {
  try {
    // Method 1: Try URL scheme
    try {
      const urlPath = encodeURIComponent(projectPath);
      const openCommand = closeOthers
        ? `windsurf://file/${urlPath}?command=open-new-window`
        : `windsurf://file/${urlPath}`;

      await execFileAsync("open", [openCommand]);
      return;
    } catch (urlError) {
      console.log("URL scheme failed, trying CLI...", urlError);
    }

    // Method 2: Try CLI command
    try {
      await execFileAsync("windsurf", [projectPath]);
      return;
    } catch (cliError) {
      console.log("CLI command failed, trying open -a...", cliError);
    }

    // Method 3: Use macOS open command with -a flag
    try {
      const args = closeOthers
        ? ["-a", "Windsurf", "--new", projectPath]
        : ["-a", "Windsurf", projectPath];
      await execFileAsync("open", args);
      return;
    } catch (openError) {
      console.log("open -a command failed", openError);
      await showToast(
        Toast.Style.Failure,
        "Failed to open project",
        "Make sure Windsurf is installed and the path is valid"
      );
      throw openError;
    }
  } catch (error) {
    console.error("Error opening project in Windsurf:", error);
    await showToast(
      Toast.Style.Failure,
      "Failed to open project in Windsurf",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}

/**
 * Opens a new Windsurf window
 */
export async function openNewWindsurfWindow(): Promise<void> {
  try {
    // Method 1: Try windsurf CLI with -n flag (new window)
    try {
      await execFileAsync("windsurf", ["-n"]);
      return;
    } catch (error) {
      console.log("CLI -n failed, trying --new-window...", error);
    }

    // Method 2: Try with --new-window flag
    try {
      await execFileAsync("windsurf", ["--new-window"]);
      return;
    } catch (error) {
      console.log("CLI --new-window failed, trying open -na...", error);
    }

    // Method 3: Use open -na with args (macOS)
    // -n = new instance, -a = application
    await execFileAsync("open", ["-na", "Windsurf", "--args", "-n"]);
  } catch (error) {
    console.error("Error opening new Windsurf window:", error);
    await showToast(
      Toast.Style.Failure,
      "Failed to open new Windsurf window",
      "Make sure Windsurf is installed"
    );
    throw error;
  }
}
