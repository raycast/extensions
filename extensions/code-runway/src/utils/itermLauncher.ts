import { execFile } from "child_process";
import { promisify } from "util";
import { Project, WarpTemplate } from "../types";
import { environment } from "@raycast/api";
import { shellCd } from "./shellQuote";

const execFileAsync = promisify(execFile);
const DEBUG = environment.isDevelopment;

/**
 * Checks whether iTerm is installed.
 */
export async function checkItermInstalled(): Promise<boolean> {
  try {
    await execFileAsync("ls", ["/Applications/iTerm.app"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Encodes a command for the iTerm URL scheme.
 */
function encodeCommand(command: string): string {
  return encodeURIComponent(command);
}

/**
 * Launches a project in iTerm.
 *
 * The iTerm URL scheme cannot choose between new windows, tabs, or splits,
 * so AppleScript remains the more reliable fallback.
 */
export async function launchItermProject(project: Project, template: WarpTemplate): Promise<void> {
  try {
    if (DEBUG) {
      console.log("Launching iTerm with project:", {
        project: project.name,
        template: template.name,
        commands: template.commands,
      });
    }

    // iTerm can execute a single command string, so combine template commands.
    const commands = template.commands
      .map((cmd) => {
        const workingDir = cmd.workingDirectory ? `${project.path}/${cmd.workingDirectory}` : project.path;
        // Change directory before running a command when needed.
        if (cmd.workingDirectory) {
          return `${shellCd(workingDir)} && ${cmd.command}`;
        }
        return cmd.command;
      })
      .filter((cmd) => cmd) // Drop empty commands.
      .join(" && "); // Chain commands in order.

    // Reuse the first command's working directory as the launch location.
    const firstCommand = template.commands[0];
    const workingDir = firstCommand?.workingDirectory
      ? `${project.path}/${firstCommand.workingDirectory}`
      : project.path;

    if (DEBUG) {
      console.log("Working directory:", workingDir);
      console.log("Combined commands:", commands);
    }

    // Try the URL scheme first.
    try {
      // iterm2:/command?c=<command>&d=<directory> uses a single slash after the scheme.
      const itermUrl = commands
        ? `iterm2:/command?c=${encodeCommand(commands)}&d=${encodeURIComponent(workingDir)}`
        : `iterm2:/command?d=${encodeURIComponent(workingDir)}`;

      if (DEBUG) console.log("Trying iTerm URL scheme:", itermUrl);

      await execFileAsync("open", [itermUrl]);

      if (DEBUG) console.log("iTerm URL scheme launched successfully");
      return;
    } catch (urlError) {
      if (DEBUG) console.log("URL scheme failed, falling back to AppleScript:", urlError);
    }

    // Fall back to AppleScript if the URL scheme fails.
    const fullCommand = commands ? `${shellCd(workingDir)} && clear && ${commands}` : `${shellCd(workingDir)} && clear`;

    // Escape special characters before embedding the command in AppleScript.
    const escapedCommand = fullCommand.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    const appleScript = `
tell application "iTerm"
  activate
  create window with default profile
  tell current session of current window
    write text "${escapedCommand}"
  end tell
end tell
    `.trim();

    if (DEBUG) console.log("Using AppleScript fallback");

    await execFileAsync("osascript", ["-e", appleScript]);

    if (DEBUG) console.log("iTerm launched successfully via AppleScript");
  } catch (error) {
    console.error("Launch iTerm failed:", error);
    throw new Error(`Failed to launch iTerm: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Opens a project in iTerm without applying a template.
 */
export async function launchItermSimple(project: Project): Promise<void> {
  try {
    if (DEBUG) {
      console.log("Launching iTerm simple mode:", project.name);
      console.log("Project path:", project.path);
    }

    // Try the URL scheme first.
    try {
      const itermUrl = `iterm2:/command?d=${encodeURIComponent(project.path)}`;

      if (DEBUG) console.log("Trying iTerm URL scheme:", itermUrl);

      await execFileAsync("open", [itermUrl]);

      if (DEBUG) console.log("iTerm URL scheme launched successfully");
      return;
    } catch (urlError) {
      if (DEBUG) console.log("URL scheme failed, falling back to AppleScript:", urlError);
    }

    // Fall back to AppleScript if the URL scheme fails.
    const fullCommand = `${shellCd(project.path)} && clear`;
    const escapedCommand = fullCommand.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    const appleScript = `
tell application "iTerm"
  activate
  create window with default profile
  tell current session of current window
    write text "${escapedCommand}"
  end tell
end tell
    `.trim();

    if (DEBUG) console.log("Using AppleScript fallback");

    await execFileAsync("osascript", ["-e", appleScript]);

    if (DEBUG) console.log("iTerm simple launch successful via AppleScript");
  } catch (error) {
    throw new Error(`Failed to launch iTerm: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Prints basic iTerm diagnostics to the development console.
 */
export async function debugItermEnvironment(): Promise<void> {
  console.log("Starting iTerm environment diagnostics...");

  // 1. Check whether the app bundle exists.
  try {
    await execFileAsync("ls", ["-la", "/Applications/iTerm.app"]);
    console.log("iTerm.app installed");
  } catch {
    console.log("iTerm.app not found in /Applications");
  }

  // 2. Verify the app can be opened.
  try {
    console.log("Testing basic app launch...");
    await execFileAsync("open", ["-a", "iTerm"]);
    console.log("Basic app launch succeeded");
  } catch (error) {
    console.log("Basic app launch failed:", error);
  }

  // 3. Verify the URL scheme works.
  try {
    console.log("Testing URL scheme...");
    const testDir = process.env.HOME || "/tmp";
    await execFileAsync("open", [`iterm2:/command?d=${encodeURIComponent(testDir)}`]);
    console.log("URL scheme launch succeeded");
  } catch (error) {
    console.log("URL scheme launch failed:", error);
  }

  console.log("iTerm environment diagnostics complete");
}
