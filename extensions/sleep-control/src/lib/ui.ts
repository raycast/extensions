import { Color, Icon, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { ApprovalCancelled, SleepState } from "./power";

export function presentation(state: SleepState | undefined, failed = false) {
  if (!state || failed)
    return {
      label: "Status Unavailable",
      action: "Refresh Status",
      icon: Icon.QuestionMarkCircle,
      color: Color.SecondaryText,
    };
  return state.disabled
    ? { label: "Staying Awake", action: "Allow Sleep", icon: "awake-menu.svg", color: Color.Orange }
    : { label: "Sleep Allowed", action: "Prevent Sleep", icon: "rest-menu.svg", color: Color.PrimaryText };
}

export async function reportError(error: unknown) {
  if (error instanceof ApprovalCancelled) return;
  await showToast({
    style: Toast.Style.Failure,
    title: "Sleep Control needs attention",
    message: error instanceof Error ? error.message : "Refresh and try again.",
  });
}

export async function refreshMenuBar() {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    // The menu bar command is optional and may not have been activated.
  }
}
