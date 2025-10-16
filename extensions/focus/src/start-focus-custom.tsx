import { Toast, showToast, LaunchProps } from "@raycast/api";
import { getProfileNames, startFocusCustom, getActiveProfileName } from "./utils";
import { ensureFocusIsRunning } from "./helpers";

interface FocusArguments {
  hours?: number;
  minutes?: number;
}

export default async function Command(props: LaunchProps<{ arguments: FocusArguments }>) {
  const { hours, minutes } = props.arguments;

  if (hours === undefined && minutes === undefined) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start focus session",
      message: "No duration specified",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Starting Focus (Custom Duration)...",
  });

  if (!(await ensureFocusIsRunning())) {
    return;
  }

  const activeProfile = await getActiveProfileName();
  if (activeProfile) {
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Focus session already running",
      message: `Profile "${activeProfile}" is currently active`,
    });
    return;
  }

  const profiles = await getProfileNames();
  const firstProfile = profiles[0];

  try {
    const success = await startFocusCustom(hours, minutes, firstProfile);
    await toast.hide();
    if (success) {
      await showToast({
        style: Toast.Style.Success,
        title: firstProfile
          ? `Focus started with profile: ${firstProfile} (${formatDuration(hours, minutes)})`
          : `Focus started (${formatDuration(hours, minutes)})`,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start focus session",
        message: "No duration specified",
      });
    }
  } catch (error) {
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start Focus",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}

function formatDuration(hours?: number, minutes?: number): string {
  const parts = [];
  if (hours) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  if (minutes) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
  return parts.join(" ");
}
