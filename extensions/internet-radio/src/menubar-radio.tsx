import { Icon, Image, launchCommand, LaunchType, LocalStorage, MenuBarExtra } from "@raycast/api";
import { getFavicon, useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getAllStations, loadDefaults, playStation } from "./utils";

export default function Command() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStationName, setCurrentStationName] = useCachedState<string>("radio-title");
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
        subtitle={stationName == currentStationName ? "Currently Playing" : ""}
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
      icon={isPlaying ? Icon.Livestream : Icon.LivestreamDisabled}
      tooltip={`Currently playing station: ${currentStationName}`}
    >
      <MenuBarExtra.Section title="Controls">
        {isPlaying ? (
          <MenuBarExtra.Item
            icon={Icon.Stop}
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
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Stations">
        <MenuBarExtra.Submenu title="Select Station">{menuItems}</MenuBarExtra.Submenu>
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
