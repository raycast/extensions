import { exec } from "child_process";
import { popToRoot, showHUD, showToast, Toast } from "@raycast/api";

export function watchStream(
  name: string,
  streamlinkLocation: string,
  quality: string,
  lowlatency: boolean,
  streamlinkConfig: string
) {
  showToast({
    title: `Starting ${lowlatency ? "low latency" : ""} Stream`,
    message: `twitch.tv / ${name}`,
    style: Toast.Style.Animated,
  });
  console.log(streamlinkConfig);
  // For low latency streams
  if (lowlatency) {
    let command = `${streamlinkLocation} twitch.tv/${name} ${quality} --twitch-low-latency`;
    if (streamlinkConfig !== "") {
      command += ` --config ${streamlinkConfig}`;
    }
    exec(command, (error, stdout, stderr) => {
      if (error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to watch stream", message: error.message });
      }
      if (stderr) {
        showToast({ style: Toast.Style.Failure, title: "Failed to watch stream", message: stderr });
      }
      popToRoot();
      showHUD("⭕ Low Latency - Stream started");
    });
    return;
  }

  // For m3u8 Streams

  // this gets the m3u8 url from the streamlink api
  exec(`${streamlinkLocation} twitch.tv/${name} ${quality} --stream-url`, (error, m3u8URL, stderr) => {
    if (error) {
      showToast({ title: "Error", message: error.message, style: Toast.Style.Failure });
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      showToast({ title: "Error", message: stderr, style: Toast.Style.Failure });
      return;
    }

    // this opens the m3u8 url in the quicktime player
    exec(`open -a "Quicktime Player" "${m3u8URL}"`, (error, _, stderr) => {
      if (error) {
        showToast({ title: "Error Opening QuickTime", message: error.message, style: Toast.Style.Failure });
        return;
      }
      if (stderr) {
        showToast({ title: "Error Opening QuickTime", message: stderr, style: Toast.Style.Failure });
        return;
      }
      showHUD("⭕ Stream started");
      popToRoot();
    });
  });
}
