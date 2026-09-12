import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";

type Terminal = Preferences["terminal"];

const terminalScripts: Record<Terminal, string> = {
  Terminal: `
    on run argv
      set service to item 1 of argv
      tell application "Terminal"
        activate
        if (count of windows) = 0 then
          do script "grpcui " & quoted form of service
        else
          tell application "System Events" to keystroke "t" using command down
          delay 0.3
          do script "grpcui " & quoted form of service in selected tab of front window
        end if
      end tell
    end run
  `,
  iTerm: `
    on run argv
      set service to item 1 of argv
      tell application "iTerm"
        activate
        if (count of windows) = 0 then
          create window with default profile
        else
          tell current window to create tab with default profile
        end if
        tell current session of current window to write text "grpcui " & quoted form of service
      end tell
    end run
  `,
  Ghostty: `
    on run argv
      set service to item 1 of argv
      set cmd to "grpcui " & quoted form of service
      do shell script "open -n -a Ghostty --args -e /bin/zsh -l -c " & quoted form of cmd
    end run
  `,
};

export const openInTerminal = async (service: string) => {
  const { terminal } = getPreferenceValues<Preferences>();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Opening ${terminal}...`,
  });

  const script = terminalScripts[terminal] ?? terminalScripts.Terminal;

  execFile("osascript", ["-e", script, "--", service], (error) => {
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
