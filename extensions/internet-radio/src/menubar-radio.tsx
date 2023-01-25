import { Icon, Image, launchCommand, LaunchType, LocalStorage, MenuBarExtra } from "@raycast/api";
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
  const stationList = stations == undefined ? [] : Object.entries(stations);
  const menuItems: JSX.Element[] = [];
  stationList.forEach(([stationName, stationData]) => {
    let websiteIcon: Image.ImageLike = Icon.Link;
    if (stationData.website != "") {
      websiteIcon = getFavicon(stationData.website as string, { fallback: Icon.Link });
    }

    menuItems.push(
      <MenuBarExtra.Item
        key={stationName}
        icon={websiteIcon}
        title={stationName}
        onAction={async () => {
          await playStation(stationName, stationData.stream as unknown as string);
          setIsPlaying(true);
          setCurrentStationName(stationName);
        }}
      />
    );
  });

  return (
    <MenuBarExtra
      isLoading={stationList.length == 0}
      title={currentStationName}
      icon={Icon.Livestream}
      tooltip={`Currently playing station: ${currentStationName}`}
    >
      <MenuBarExtra.Item title="Controls" />

      {isPlaying ? (
        <MenuBarExtra.Item
          icon={Icon.Pause}
          title="Stop Playback"
          onAction={async () => await launchCommand({ name: "stop-playback", type: LaunchType.Background })}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          tooltip="Stop playback of the currently playing station"
        />
      ) : null}

      <MenuBarExtra.Item
        icon={Icon.ArrowCounterClockwise}
        title="Play Last Station"
        onAction={async () => await launchCommand({ name: "play-last-station", type: LaunchType.Background })}
        shortcut={{ modifiers: ["cmd"], key: "l" }}
        tooltip="Resume playback of the last stopped station"
      />

      <MenuBarExtra.Item
        icon={Icon.Shuffle}
        title="Play Random Station"
        onAction={async () => await launchCommand({ name: "play-random-station", type: LaunchType.Background })}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        tooltip="Start playing a randomly selected station"
      />

      <MenuBarExtra.Submenu title="Select Station">{menuItems}</MenuBarExtra.Submenu>
    </MenuBarExtra>
  );
}
