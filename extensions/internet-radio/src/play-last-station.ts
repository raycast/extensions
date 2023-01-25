import { LocalStorage, showToast, Toast } from "@raycast/api";
import { playStation } from "./utils";

export default async function Command() {
    const lastStationName = await LocalStorage.getItem("-last-station-name")
    const lastStationURL = await LocalStorage.getItem("-last-station-url")

    if (lastStationName && lastStationURL && lastStationName != "" || lastStationURL != "") {
        await playStation(lastStationName as string, lastStationURL as string)
        await showToast({ title: `Resuming Station: ${lastStationName}` })
    } else {
        await showToast({ title: "Failed to play last station", style: Toast.Style.Failure })
    }
}