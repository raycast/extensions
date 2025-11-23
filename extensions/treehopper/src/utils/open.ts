import { execSync } from "node:child_process";
import { getPreferences } from "./config";

export function openInEditor(path: string) {
  const prefs = getPreferences();
  execSync(`${prefs.editor} "${path}"`);
}

export function openInTerminal(path: string) {
  const prefs = getPreferences();

  switch (prefs.terminal) {
    case "iterm":
      execSync(`osascript -e '
        tell application "iTerm"
          activate
          create window with default profile
          tell current session of current window
            write text "cd '"'"'${path}'"'"'"
          end tell
        end tell
      '`);
      break;

    case "warp":
      execSync(`osascript -e '
        tell application "Warp"
          activate
          tell application "System Events"
            keystroke "t" using command down
            delay 0.2
            keystroke "cd '"'"'${path}'"'"'"
            key code 36
          end tell
        end tell
      '`);
      break;
    default:
      execSync(`osascript -e '
        tell application "Terminal"
          activate
          do script "cd '"'"'${path}'"'"'"
        end tell
      '`);
      break;
  }
}
