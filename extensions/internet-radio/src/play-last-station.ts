import { environment, LaunchType, LocalStorage, showToast, Toast } from "@raycast/api";
import { loadDefaults, playStation } from "./utils";

export default async function Command() {
  await loadDefaults();
  const lastStationName = await LocalStorage.getItem("-last-station-name");
  const lastStationURL = await LocalStorage.getItem("-last-station-url");

  if ((lastStationName && lastStationURL && lastStationName != "") || lastStationURL != "") {
    const status = await playStation(lastStationName as string, lastStationURL as string);
    if (status != -1 && environment.launchType == LaunchType.UserInitiated) {
      await showToast({ title: "Resuming Station", message: lastStationName as string });
    }
  } else if (environment.launchType == LaunchType.UserInitiated) {
    await showToast({ title: "Failed to play last station", style: Toast.Style.Failure });
  }
}
