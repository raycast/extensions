import { exec } from "child_process";
import { popToRoot, showHUD, showToast, Toast } from "@raycast/api";

export function watchStream(
  name: string,
  streamlinkLocation: string | undefined,
  quality: string | undefined,
  lowlatency: boolean | undefined,
  streamlinkConfig: string | undefined,
) {
  if (name.includes("twitch.tv/")) {
    name = name.replace(/^(https?:\/\/)?(www\.)?twitch\.tv\//, "");
  }

  showToast({
    title: `Starting ${lowlatency ? "low latency" : ""} Stream`,
    message: `twitch.tv / ${name}`,
    style: Toast.Style.Animated,
  });

  // For low latency streams
  if (lowlatency) {
    let command = `${streamlinkLocation} twitch.tv/${name} ${quality} --twitch-low-latency`;
    if (streamlinkConfig && streamlinkConfig !== "") {
      command += ` --config ${streamlinkConfig}`;
    }

    exec(command, (error, _, stderr) => {
      if (error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to watch stream", message: error.message });
        return;
      }
      if (stderr) {
        showToast({ style: Toast.Style.Failure, title: "Failed to watch stream", message: stderr });
        return;
      }
      popToRoot();
      showHUD("⭕ Low Latency - Stream started");
    });
    return;
  }

  // this will open the stream in the default player configured in streamlink
  exec(`${streamlinkLocation} twitch.tv/${name} ${quality}`, (error, _, stderr) => {
    if (error) {
      showToast({ title: "Error", message: error.message, style: Toast.Style.Failure });
      return;
    }
    if (stderr) {
      showToast({ title: "Error", message: stderr, style: Toast.Style.Failure });
      return;
    }

    popToRoot();
    showHUD("⭕ Stream started");
  });
}
