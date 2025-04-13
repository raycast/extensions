import { ActionPanel, Action, showToast, Toast, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

interface ActionsProps {
  radioButtonNumber: number;
}

export const Actions = ({ radioButtonNumber }: ActionsProps) => {
  const appleScript = `
    tell application "Activity Monitor"
      activate
      tell application "System Events"
        tell process "Activity Monitor"
          tell window 1
            tell group 1 of toolbar 1
              tell radio group 1
                click radio button ${radioButtonNumber}
              end tell
            end tell
          end tell
        end tell
      end tell
    end tell
  `;

  const handleRunAppleScript = async () => {
    try {
      await runAppleScript(appleScript);
      await closeMainWindow();
    } catch (error) {
      await showToast({
        title: "Failed to open activity monitor",
        message: (error as Error).message,
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <ActionPanel>
      <Action title="Open Activity Monitor" onAction={handleRunAppleScript} />
    </ActionPanel>
  );
};
