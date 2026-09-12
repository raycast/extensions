import { runAppleScript } from "@raycast/utils";
import { execFile as execFileCb } from "child_process";
import { promisify } from "util";
import { escapeForAppleScript } from "./utils";

const execFileAsync = promisify(execFileCb);

export async function launchInTerminal(terminalValue: string, command: string) {
  const escapedCommand = escapeForAppleScript(command);
  const shell = process.env.SHELL || "/bin/zsh";

  switch (terminalValue) {
    case "terminal":
      await runAppleScript(`tell application "Terminal"
        activate
        do script "${escapedCommand}"
      end tell`);
      break;
    case "iterm2":
      await runAppleScript(`tell application "iTerm"
        activate
        set newWindow to (create window with default profile)
        tell current session of newWindow
          write text "${escapedCommand}"
        end tell
      end tell`);
      break;
    case "warp":
      await runAppleScript(`tell application "Warp"
        activate
        do script "${escapedCommand}"
      end tell`);
      break;
    case "alacritty":
      await execFileAsync("open", ["-na", "Alacritty", "--args", "-e", shell, "-lic", command]);
      break;
    case "kitty":
      await execFileAsync("open", ["-na", "kitty", "--args", shell, "-lic", command]);
      break;
    case "wezterm":
      await execFileAsync("open", ["-na", "WezTerm", "--args", "start", "--", shell, "-lic", command]);
      break;
    case "ghostty":
      await execFileAsync("open", ["-na", "Ghostty", "--args", "-e", shell, "-lic", command]);
      break;
    default:
      throw new Error(`Unsupported terminal: ${terminalValue}`);
  }
}
