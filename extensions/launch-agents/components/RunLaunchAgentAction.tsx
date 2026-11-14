import { Action, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { runLaunchAgent } from "../lib/plist";

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

export default function RunLaunchAgentAction({ label }: { label: string }) {
  return (
    <Action
      icon={Icon.Play}
      title="Run Now"
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={() => runLaunchAgentWithToast(label)}
    />
  );
}
