import { getDefaultApplication, open, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { Terminal, TerminalConfig } from "./types";

// Terminal application paths
export const TERMINAL = "/System/Applications/Utilities/Terminal.app";
export const ITERM2 = "/Applications/iTerm.app";
export const WARP = "/Applications/Warp.app";
export const HYPER = "/Applications/Hyper.app";
export const GHOSTTY = "/Applications/Ghostty.app";

const TERMINAL_CONFIGS: TerminalConfig[] = [
  { path: TERMINAL, supportInput: true, key: "t", name: "Terminal" },
  { path: ITERM2, supportInput: true, key: "i", name: "iTerm" },
  { path: WARP, supportInput: false, key: "w", name: "Warp" },
  { path: HYPER, supportInput: false, key: "h", name: "Hyper" },
  { path: GHOSTTY, supportInput: false, key: "g", name: "Ghostty" },
];

/**
 * Detect installed terminal applications on the system
 */
export async function getAvailableTerminals(): Promise<Terminal[]> {
  const terminals: Terminal[] = [];

  for (const config of TERMINAL_CONFIGS) {
    try {
      const app = await getDefaultApplication(config.path);
      terminals.push({
        application: app,
        supportInput: config.supportInput,
        key: config.key,
        name: config.name,
      });
    } catch (e) {
      // Terminal not installed, skip it
      console.debug(`Terminal not found: ${config.path}`);
    }
  }

  return terminals;
}

/**
 * Get the default terminal (first available one)
 */
export async function getDefaultTerminal(): Promise<Terminal | null> {
  const terminals = await getAvailableTerminals();
  return terminals.length > 0 ? terminals[0] : null;
}

/**
 * Execute command in the specified terminal (improved version)
 */
export async function executeInTerminal(command: string, terminal: Terminal): Promise<void> {
  let ret;
  try {
    // Open the terminal application
    await open(terminal.application.path);

    if (terminal.supportInput) {
      // Use AppleScript for terminals that support it
      const script = runCommandInTerminalScript(command, terminal);
      ret = await runAppleScript(script);
    } else {
      // Use clipboard + keyboard simulation for other terminals
      ret = await runAppleScript(pressDownEnterScript(command, terminal));
    }
  } catch (e) {
    console.error(`Failed to execute in ${terminal.name}:`, e);
    ret = e;
  }

  // Show feedback
  if (ret) {
    await showToast({
      title: String(ret),
      style: Toast.Style.Failure,
    });
  } else {
    await showHUD(`🚀 Run '${command}' in ${terminal.application.name}`);
  }
}

/**
 * Generate AppleScript for terminals that support command input
 */
function runCommandInTerminalScript(command: string, terminal: Terminal): string {
  const escapedCommand = command.replace(/"/g, '\\"');
  const appName = terminal.application.name;

  let script: string;

  switch (terminal.application.path) {
    case TERMINAL:
      // Terminal.app: check if window exists, create one if not
      script = `
try
	tell application "${appName}"
		activate
		if (count of windows) is 0 then
			do script "${escapedCommand}"
		else
			do script "${escapedCommand}" in window 1
		end if
	end tell
	return ""
on error errMsg
	return errMsg
end try
      `;
      break;

    case ITERM2:
      // iTerm2: write to current session, create window if needed
      script = `
try
	tell application "${appName}"
		activate
		try
			set currentWindow to current window
			tell current session of currentWindow
				write text "${escapedCommand}"
			end tell
		on error
			create window with default profile
			tell current session of current window
				write text "${escapedCommand}"
			end tell
		end try
	end tell
	return ""
on error errMsg
	return errMsg
end try
      `;
      break;

    default:
      script = "";
      break;
  }

  return script;
}

/**
 * Generate AppleScript for terminals that don't support command input
 * Uses clipboard + keyboard simulation (Cmd+V then Enter)
 */
function pressDownEnterScript(command: string, terminal: Terminal): string {
  const safeCmd = command.replace(/"/g, '\\"');
  const appName = terminal.application.name;

  return `
try
	tell application "${appName}"
		activate
		delay 0.3
		set the clipboard to "${safeCmd}"
		tell application "System Events"
			key code 9 using {command down}
			delay 0.1
			key code 36
		end tell
	end tell
	return ""
on error errMsg
	return errMsg
end try
  `;
}
