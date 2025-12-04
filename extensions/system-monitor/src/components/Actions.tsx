import { ActionPanel, Action, showToast, Toast, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { openActivityMonitorAppleScript } from "../utils";

interface ActionsProps {
  radioButtonNumber?: number;
}

export const Actions = ({ radioButtonNumber }: ActionsProps) => {
  const handleRunAppleScript = async () => {
    try {
      await runAppleScript(openActivityMonitorAppleScript(radioButtonNumber ?? null));
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
