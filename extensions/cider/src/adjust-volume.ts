import { getPreferenceValues, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { callCider } from "./functions";

interface AdjustVolumeArguments {
  volume: string;
}

interface Preferences {
  exitOnSuccess: boolean;
}

export default async function Command(props: LaunchProps<{ arguments: AdjustVolumeArguments }>) {
  const volume = parseInt(props.arguments.volume);

  if (volume === undefined || isNaN(volume) || volume < 0 || volume > 100) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Volume",
      message: "Volume must be a number between 0 and 100.",
    });
    return;
  }

  const { exitOnSuccess } = getPreferenceValues() as Preferences;

  try {
    await callCider("/playback/active");
    try {
      await callCider("/playback/volume", "POST", { volume: volume / 100 });
      if (exitOnSuccess) await showHUD("🔊 Adjusted Volume");
      else
        await showToast({
          style: Toast.Style.Success,
          title: "Adjusted Volume",
          message: "Please note that the in-app slider might not update.",
        });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Something Went Wrong",
        message: "Please try again later or contact the developer.",
      });
    }
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't Connect to Cider",
      message: "Make sure Cider is running and playing something and try again.",
    });
  }
}
