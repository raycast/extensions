import { environment, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { getAllStations, loadDefaults, playStation } from "./utils";

export default async function Command() {
  await loadDefaults();
  const stations = await getAllStations();
  const stationList = Object.entries(stations);

  if (stationList.length == 0) {
    if (environment.launchType == LaunchType.UserInitiated) {
      await showToast({ title: "No Saved Stations To Play", style: Toast.Style.Failure });
    } else {
      await showHUD("No Saved Stations To Play");
    }
    return;
  }

  const randomStation = stationList[Math.floor(Math.random() * stationList.length)];
  const status = await playStation(randomStation[0], randomStation[1].stream as string);

  if (status != -1 && environment.launchType == LaunchType.UserInitiated) {
    await showToast({ title: "Playing Station", message: randomStation[0] });
  }
}
