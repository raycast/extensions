import { environment, LaunchType, showToast, Toast } from "@raycast/api";
import { getAllStations, loadDefaults, playStation } from "./utils";

export default async function Command() {
  await loadDefaults();
  const stations = await getAllStations();
  const stationList = Object.entries(stations);

  if (stationList.length == 0) {
    if (environment.launchType == LaunchType.UserInitiated) {
      await showToast({ title: "No Stations To Play", style: Toast.Style.Failure });
    }
    return;
  }

  const randomStation = stationList[Math.floor(Math.random() * stationList.length)];

  await playStation(randomStation[0], randomStation[1].stream as string);

  if (environment.launchType == LaunchType.UserInitiated) {
    await showToast({ title: "Playing Station", message: randomStation[0] });
  }
}
