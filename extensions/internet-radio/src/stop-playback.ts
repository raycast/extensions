import { LocalStorage, showToast, Toast } from "@raycast/api";
import { deleteTrack, loadDefaults, pausePlayback } from "./utils";

export default async function Command() {
  await loadDefaults();
  const currentStationName = await LocalStorage.getItem("-current-station-name");
  const currentTrackID = await LocalStorage.getItem("-current-track-id");

  if (currentStationName && currentTrackID && currentStationName != "" && currentTrackID != "") {
    await pausePlayback();
    await deleteTrack(currentTrackID as string);
    await showToast({ title: "Stopped Station", message: currentStationName as string });
  } else {
    await showToast({ title: "No Station Playing", style: Toast.Style.Failure });
  }
}
