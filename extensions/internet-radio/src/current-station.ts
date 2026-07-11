import { environment, LaunchType, LocalStorage, showToast, updateCommandMetadata } from "@raycast/api";

export default async function Command() {
  const stationName = await LocalStorage.getItem("-current-station-name");
  if (stationName == "") {
    await updateCommandMetadata({ subtitle: "No Station Playing" });
  } else {
    await updateCommandMetadata({ subtitle: `Now Playing: ${stationName}` });
  }

  if (environment.launchType == LaunchType.UserInitiated) {
    await showToast({ title: "Refreshed!" });
  }
}
