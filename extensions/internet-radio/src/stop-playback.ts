import { environment, LaunchType, LocalStorage, showToast, Toast } from "@raycast/api";
import { deleteTrack, loadDefaults, pausePlayback } from "./utils";

export default async function Command() {
  await loadDefaults();
  const currentStationName = await LocalStorage.getItem("-current-station-name");
  const currentTrackID = await LocalStorage.getItem("-current-track-id");

  if (currentTrackID && currentTrackID != "") {
    await pausePlayback();
    await deleteTrack(currentTrackID as string);

    if (environment.launchType == LaunchType.UserInitiated) {
      await showToast({ title: "Stopped Station", message: currentStationName as string });
    }
  } else if (currentStationName && currentStationName != "") {
    await pausePlayback();
    await deleteTrack(undefined, `Raycast: ${currentStationName}`);

    if (environment.launchType == LaunchType.UserInitiated) {
      await showToast({ title: "Stopped Station", message: currentStationName as string });
    }
  } else if (environment.launchType == LaunchType.UserInitiated) {
    await showToast({ title: "No Station Playing", style: Toast.Style.Failure });
  }
}
