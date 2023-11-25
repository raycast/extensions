import { environment, LaunchType, LocalStorage, showToast, Toast } from "@raycast/api";
import { deleteTrack, playStation, loadDefaults, pausePlayback } from "./utils";

export default async function Command() {
  await loadDefaults();
  const currentStationName = await LocalStorage.getItem("-current-station-name");
  const currentTrackID = await LocalStorage.getItem("-current-track-id");

  const lastStationName = await LocalStorage.getItem("-last-station-name");
  const lastStationURL = await LocalStorage.getItem("-last-station-url");

  if (currentStationName && currentTrackID && currentStationName != "" && currentTrackID != "") {
    await pausePlayback();
    await deleteTrack(currentTrackID as string);

    if (environment.launchType == LaunchType.UserInitiated) {
      await showToast({ title: "Stopped Station", message: currentStationName as string });
    }
  } else if ((lastStationName && lastStationURL && lastStationName != "") || lastStationURL != "") {
    await playStation(lastStationName as string, lastStationURL as string);
    if (environment.launchType == LaunchType.UserInitiated) {
      await showToast({ title: "Resuming Station", message: lastStationName as string });
    }
  } else if (environment.launchType == LaunchType.UserInitiated) {
    await showToast({ title: "Failed to play last station", style: Toast.Style.Failure });
  }
}
