import { Toast, showToast, LaunchProps } from "@raycast/api";
import { getProfileNames, takeBreakCustom, takeBreakWithProfileCustom, isBreakRunning } from "./utils";
import { ensureFocusIsRunning } from "./helpers";

interface BreakArguments {
  minutes?: number;
}

export default async function Command(props: LaunchProps<{ arguments: BreakArguments }>) {
  const { minutes } = props.arguments;

  if (minutes === undefined || isNaN(minutes) || minutes <= 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start break",
      message: "No duration specified",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Checking break status...",
  });

  if (!(await ensureFocusIsRunning())) {
    return;
  }

  const breakRunning = await isBreakRunning();

  if (breakRunning) {
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Break already running",
      message: "There is an active break in progress.",
    });
    return;
  }

  toast.title = `Starting break (${minutes} minutes)...`;

  const profiles = await getProfileNames();
  const firstProfile = profiles[0];

  try {
    let success: boolean;
    if (profiles.length === 0) {
      success = await takeBreakCustom(minutes);
    } else {
      success = await takeBreakWithProfileCustom(firstProfile, minutes);
    }
    await toast.hide();
    if (success) {
      await showToast({
        style: Toast.Style.Success,
        title: firstProfile
          ? `Break started with profile: ${firstProfile} (${minutes} minutes)`
          : `Break started (${minutes} minutes)`,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start break",
        message: "Unable to start break with the specified duration",
      });
    }
  } catch (error) {
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start break",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}
