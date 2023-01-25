import { Icon, launchCommand, LaunchType, LocalStorage, MenuBarExtra } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getAllStations, loadDefaults, playStation } from "./utils";

export default function Command() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStationName, setCurrentStationName] = useState<string>("");
  const [stations, setStations] = useState<{ [stationName: string]: { [key: string]: string | string[] } }>();

  // Load default stations, if necessary
  useEffect(() => {
    loadDefaults().then(() => {
      getAllStations().then((stationList) => {
        setStations(stationList);
      });
    });
  }, []);

  // Update state to reflect current play state
  LocalStorage.getItem("-is-playing").then((playStatus) => setIsPlaying(playStatus as boolean));
  LocalStorage.getItem("-current-station-name").then((stationName) => setCurrentStationName(stationName as string));

  // Create a menu subitem for each station
  const stationList = stations == undefined ? [] : Object.entries(stations)
  const menuItems: JSX.Element[] = [];
  stationList.forEach(([stationName, stationData]) => {
    menuItems.push(
      <MenuBarExtra.Item
        icon={getFavicon(stationData.website as string)}
        title={stationName}
        onAction={async () => {
          await playStation(stationName, stationData.stream as unknown as string)
          setIsPlaying(true);
          setCurrentStationName(stationName);
        }}
      />
    )
  })

  return (
    <MenuBarExtra isLoading={stationList.length == 0} title={currentStationName} icon={Icon.Livestream} tooltip="Your Pull Requests">
      <MenuBarExtra.Item title="Controls" />
      
      {isPlaying ? (<MenuBarExtra.Item
        icon={Icon.Pause}
        title="Stop Playback"
        onAction={async () => await launchCommand({ name: "stop-playback", type: LaunchType.Background })
        }
      />) : null}

      <MenuBarExtra.Item
        icon={Icon.ArrowCounterClockwise}
        title="Play Last Station"
        onAction={async () => await launchCommand({ name: "play-last-station", type: LaunchType.Background })}
      />

      <MenuBarExtra.Item
        icon={Icon.Shuffle}
        title="Play Random Station"
        onAction={async () => await launchCommand({ name: "play-random-station", type: LaunchType.Background })}
      />

      <MenuBarExtra.Submenu title="Select Station">
        {menuItems}
      </MenuBarExtra.Submenu>
    </MenuBarExtra>
  );
}
