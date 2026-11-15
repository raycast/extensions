import { Action, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getLaunchAgentLabel, runLaunchAgent } from "../lib/plist";

export const runLaunchAgentWithToast = async (label: string) => {
  try {
    runLaunchAgent(label);
    await showToast(Toast.Style.Success, "Started", label);
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString().trim();
    await showFailureToast(stderr || error, {
      title: `Could not run ${label}`,
      message: stderr?.includes("Could not find service") ? "Load the launch agent first." : undefined,
    });
  }
};

type RunLaunchAgentActionProps = ({ label: string; filePath?: never } | { filePath: string; label?: never }) & {
  /** Set to false when Run Now is the primary action, where a custom shortcut isn't shown. */
  withShortcut?: boolean;
};

export default function RunLaunchAgentAction({ label, filePath, withShortcut = true }: RunLaunchAgentActionProps) {
  return (
    <Action
      icon={Icon.Play}
      title="Run Now"
      shortcut={withShortcut ? { modifiers: ["cmd"], key: "r" } : undefined}
      // Read the label only when the action runs, so lists don't call plutil for every item.
      onAction={() => runLaunchAgentWithToast(label ?? getLaunchAgentLabel(filePath as string))}
    />
  );
}
