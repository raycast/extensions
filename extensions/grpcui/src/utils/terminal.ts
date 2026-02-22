import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { Terminal } from "../types";

const escapeAppleScript = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const escapeShell = (s: string) => s.replace(/'/g, "'\\''");

const commands: Record<Terminal, (service: string) => string> = {
  Terminal: (service) => {
    const escaped = escapeAppleScript(service);
    return `osascript -e '
      tell application "Terminal"
        activate
        if (count of windows) = 0 then
          do script "grpcui ${escaped}"
        else
          tell application "System Events" to keystroke "t" using command down
          delay 0.3
          do script "grpcui ${escaped}" in selected tab of front window
        end if
      end tell
    '`;
  },
  iTerm: (service) => {
    const escaped = escapeAppleScript(service);
    return `osascript -e '
      tell application "iTerm"
        activate
        if (count of windows) = 0 then
          create window with default profile
        else
          tell current window to create tab with default profile
        end if
        tell current session of current window to write text "grpcui ${escaped}"
      end tell
    '`;
  },
  Ghostty: (service) => {
    const escaped = escapeShell(service);
    return `open -n -a Ghostty --args -e /bin/zsh -l -c 'grpcui ${escaped}'`;
  },
};

export const openInTerminal = async (service: string) => {
  const { terminal } = getPreferenceValues<{ terminal: Terminal }>();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Opening ${terminal}...`,
  });

  const command = commands[terminal] ?? commands.Terminal;

  exec(command(service), (error) => {
    if (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Error opening ${terminal}`;
      toast.message = error.message;
    } else {
      toast.style = Toast.Style.Success;
      toast.title = `${terminal} opened!`;
    }
  });
};
