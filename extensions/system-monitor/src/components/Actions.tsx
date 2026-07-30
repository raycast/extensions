import { Action, ActionPanel, Clipboard, Icon, Toast, closeMainWindow, open, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

import { ProcessInfo } from "../Interfaces";
import { buildSystemReport } from "../lib/system-report";
import { openActivityMonitorAppleScript } from "../utils";

interface ActionsProps {
  radioButtonNumber?: number;
  processes?: ProcessInfo[];
}

export const Actions = ({ radioButtonNumber }: ActionsProps) => {
  const handleRunAppleScript = async () => {
    try {
      await runAppleScript(openActivityMonitorAppleScript(radioButtonNumber ?? null));
      await closeMainWindow();
    } catch (error) {
      await showToast({
        title: "Failed to open Activity Monitor",
        message: (error as Error).message,
        style: Toast.Style.Failure,
      });
    }
  };

  const handleCopySystemReport = async () => {
    try {
      const report = await buildSystemReport();
      await Clipboard.copy(report);
      await showToast({
        style: Toast.Style.Success,
        title: "System report copied",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy system report",
        message: (error as Error).message,
      });
    }
  };

  return (
    <ActionPanel>
      <Action icon={Icon.Bolt} title="Open Activity Monitor" onAction={handleRunAppleScript} />
      <Action icon={Icon.Gear} title="Open System Settings" onAction={() => open("x-apple.systempreferences:")} />
      <Action
        icon={Icon.Info}
        title="Open System Information"
        onAction={() => open("file:///System/Applications/Utilities/System%20Information.app")}
      />
      <Action icon={Icon.Clipboard} title="Copy System Report" onAction={handleCopySystemReport} />
    </ActionPanel>
  );
};
