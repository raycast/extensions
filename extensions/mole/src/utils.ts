import { showHUD, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { existsSync } from "fs";

const POSSIBLE_PATHS = ["/usr/local/bin/mo", "/opt/homebrew/bin/mo", "/usr/bin/mo"];

function findMoBinary(): string {
  for (const p of POSSIBLE_PATHS) {
    if (existsSync(p)) return p;
  }
  // Try which
  try {
    return execSync("which mo", { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

const MO_BIN = findMoBinary();

function getTerminalApp(): string {
  const apps = ["Warp", "Ghostty", "Alacritty", "kitty", "WezTerm", "Hyper", "iTerm", "Terminal"];
  for (const app of apps) {
    try {
      execSync(`osascript -e 'id of app "${app}"' 2>/dev/null`, { encoding: "utf-8" });
      return app;
    } catch {
      continue;
    }
  }
  return "Terminal";
}

export async function runMoleCommand(subcommand: string, flags: string[] = []) {
  if (!MO_BIN) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Mole not found",
      message: "Install Mole: brew install mole",
    });
    return;
  }

  const args = [subcommand, ...flags].join(" ");
  const fullCommand = `${MO_BIN} ${args}`;
  const terminal = getTerminalApp();

  await showHUD(`Running: mo ${args}`);

  // Use AppleScript to open in the user's terminal
  const script = buildAppleScript(terminal, fullCommand);

  try {
    execSync(`osascript -e '${script}'`, { encoding: "utf-8" });
  } catch {
    // Fallback: try opening via Terminal.app
    try {
      execSync(`osascript -e 'tell application "Terminal" to do script "${fullCommand}"'`, { encoding: "utf-8" });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to launch",
        message: "Could not open terminal to run Mole",
      });
    }
  }
}

function buildAppleScript(terminal: string, command: string): string {
  const escaped = command.replace(/'/g, "'\\''");

  switch (terminal) {
    case "iTerm":
      return `tell application "iTerm"
        activate
        set newWindow to (create window with default profile command "${escaped}")
      end tell`;

    case "Warp":
    case "Ghostty":
    case "Hyper":
    case "WezTerm":
      return `tell application "${terminal}"
        activate
      end tell
      delay 0.5
      tell application "System Events"
        keystroke "${escaped}"
        key code 36
      end tell`;

    case "Alacritty":
    case "kitty":
      return `do shell script "open -a ${terminal}"
      delay 0.5
      tell application "System Events"
        keystroke "${escaped}"
        key code 36
      end tell`;

    default:
      return `tell application "Terminal"
        activate
        do script "${escaped}"
      end tell`;
  }
}
