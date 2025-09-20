import { exec } from "child_process";
import { promisify } from "util";
import { showHUD, showToast, Toast } from "@raycast/api";

const execAsync = promisify(exec);

/**
 * Execute a shell command with improved environment
 * This uses the full shell environment unlike Node's spawn/exec
 */
export async function executeCommand(
  command: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    console.log(`Executing command: ${command}`);
    const { stdout, stderr } = await execAsync(command, {
      shell: process.env.SHELL || "/bin/zsh",
      env: {
        ...process.env,
        PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin:${process.env.HOME}/.local/bin`,
      },
    });

    return { stdout, stderr, exitCode: 0 };
  } catch (error: any) {
    console.error("Command execution error:", error);
    return {
      stdout: error?.stdout || "",
      stderr: error?.stderr || error?.message || "Unknown error",
      exitCode: error?.code || 1,
    };
  }
}

/**
 * Run a command in a new Terminal window and return right away
 */
export async function runInTerminal(
  command: string,
  pwd?: string,
): Promise<void> {
  const workingDir = pwd || process.env.HOME || ".";
  const escapedDir = workingDir.replace(/"/g, '\\"');
  const escapedCommand = command.replace(/"/g, '\\"');

  const script = `
    tell application "Terminal"
      activate
      do script "cd \\"${escapedDir}\\" && ${escapedCommand}"
    end tell
  `;

  await execAsync(`osascript -e '${script}'`);
}

/**
 * Install sendme using Homebrew in Terminal
 */
export async function installSendmeWithBrewViaTerminal(): Promise<boolean> {
  await showToast({
    style: Toast.Style.Animated,
    title: "Installing sendme with Homebrew",
    message: "Opening Terminal to run brew install command",
  });

  // Use Terminal to run the brew command
  //Only when raycast didnt able to execute this
  await runInTerminal("brew install sendme");
  //If the above fails then try manual curling -->ok for now might change it later
  await showHUD("Homebrew installation started in Terminal");
  return true;
}
