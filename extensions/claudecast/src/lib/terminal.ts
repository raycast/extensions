import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";

const execFilePromise = promisify(execFile);

type TerminalApp = "Terminal" | "iTerm" | "Warp" | "kitty" | "Ghostty";

/**
 * Open a new terminal window/tab and run a command
 */
export async function openTerminalWithCommand(
  command: string,
  options: {
    cwd?: string;
    terminalApp?: string;
  } = {},
): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const terminal = (options.terminalApp ||
    preferences.terminalApp ||
    "Terminal") as TerminalApp;
  const cwd = options.cwd || process.env.HOME || "/";

  try {
    switch (terminal) {
      case "Terminal":
        await openInTerminalApp(command, cwd);
        break;
      case "iTerm":
        await openInITerm(command, cwd);
        break;
      case "Warp":
        await openInWarp(command, cwd);
        break;
      case "kitty":
        await openInKitty(command, cwd);
        break;
      case "Ghostty":
        await openInGhostty(command, cwd);
        break;
      default:
        await openInTerminalApp(command, cwd);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open terminal",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function openInTerminalApp(command: string, cwd: string): Promise<void> {
  const escapedCommand = command.replace(/"/g, '\\"').replace(/\$/g, "\\$");
  const escapedCwd = cwd.replace(/"/g, '\\"');

  const script = `
    tell application "Terminal"
      activate
      do script "cd \\"${escapedCwd}\\" && ${escapedCommand}"
    end tell
  `;

  await execFilePromise("osascript", ["-e", script]);
}

async function openInITerm(command: string, cwd: string): Promise<void> {
  const escapedCommand = command.replace(/"/g, '\\"').replace(/\$/g, "\\$");
  const escapedCwd = cwd.replace(/"/g, '\\"');

  const script = `
    tell application "iTerm"
      activate
      create window with default profile
      tell current session of current window
        write text "cd \\"${escapedCwd}\\" && ${escapedCommand}"
      end tell
    end tell
  `;

  await execFilePromise("osascript", ["-e", script]);
}

async function openInWarp(command: string, cwd: string): Promise<void> {
  // Warp supports a special URL scheme
  const encodedCommand = encodeURIComponent(`cd "${cwd}" && ${command}`);
  await open(`warp://action/new_tab?command=${encodedCommand}`);
}

async function openInKitty(command: string, cwd: string): Promise<void> {
  // Kitty can be invoked directly via execFile with array arguments
  await execFilePromise("kitty", [
    "--single-instance",
    `--directory=${cwd}`,
    "-e",
    "sh",
    "-c",
    command,
  ]);
}

async function openInGhostty(command: string, cwd: string): Promise<void> {
  const escapedCommand = command.replace(/"/g, '\\"').replace(/\$/g, "\\$");
  const escapedCwd = cwd.replace(/"/g, '\\"');

  // Try direct invocation first via execFile with array arguments
  try {
    await execFilePromise("ghostty", [
      `--working-directory=${cwd}`,
      "-e",
      "sh",
      "-c",
      command,
    ]);
  } catch {
    // Fallback to AppleScript using execFile with array arguments
    const script = `
      tell application "Ghostty"
        activate
      end tell
      delay 0.5
      tell application "System Events"
        keystroke "cd \\"${escapedCwd}\\" && ${escapedCommand}"
        keystroke return
      end tell
    `;
    await execFilePromise("osascript", ["-e", script]);
  }
}

/**
 * Launch Claude Code in a terminal
 */
export async function launchClaudeCode(options: {
  projectPath?: string;
  sessionId?: string;
  continueSession?: boolean;
  forkSession?: boolean;
  prompt?: string;
  printMode?: boolean; // Use -p flag for non-interactive output
}): Promise<void> {
  const args: string[] = ["claude"];

  if (options.sessionId) {
    args.push("-r", options.sessionId);
    if (options.forkSession) {
      args.push("--fork-session");
    }
  } else if (options.continueSession) {
    args.push("-c");
  }

  if (options.prompt) {
    if (options.printMode) {
      // Non-interactive mode - just print result and exit
      args.push("-p", `"${options.prompt.replace(/"/g, '\\"')}"`);
    } else {
      // Interactive mode - start session with initial prompt
      // Escape the prompt for shell and add as positional argument
      args.push(`"${options.prompt.replace(/"/g, '\\"')}"`);
    }
  }

  const command = args.join(" ");
  await openTerminalWithCommand(command, { cwd: options.projectPath });
}

/**
 * Get list of available terminal apps
 */
export async function getAvailableTerminals(): Promise<TerminalApp[]> {
  const terminals: TerminalApp[] = ["Terminal"]; // Always available

  const checks: [string, TerminalApp][] = [
    ["iTerm", "iTerm"],
    ["Warp", "Warp"],
    ["kitty", "kitty"],
    ["Ghostty", "Ghostty"],
  ];

  for (const [appName, terminal] of checks) {
    try {
      await execFilePromise("osascript", [
        "-e",
        `id of application "${appName}"`,
      ]);
      terminals.push(terminal);
    } catch {
      // App not installed
    }
  }

  return terminals;
}
