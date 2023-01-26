import { Color, Icon, Image, launchCommand, LaunchType, LocalStorage, MenuBarExtra } from "@raycast/api";
import { getFavicon, useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { colorMap, getAllStations, loadDefaults, playStation } from "./utils";

export default function Command() {
  const [isPlaying, setIsPlaying] = useCachedState<string>("false");
  const [currentStationName, setCurrentStationName] = useCachedState<string>("radio-title");
  const [stations, setStations] = useState<{ [stationName: string]: { [key: string]: string | string[] } }>();
  const [cachedIconColor, setCachedIconColor] = useCachedState<string>("#000000");

  // Load default stations, if necessary
  useEffect(() => {
    loadDefaults().then(() => {
      getAllStations().then((stationList) => {
        setStations(stationList);
      });
    });
  }, []);

  // Update state to reflect current play state
  LocalStorage.getItem("-is-playing").then((playStatus) => setIsPlaying(playStatus as string));
  LocalStorage.getItem("-current-station-name").then((stationName) => setCurrentStationName(stationName as string));

  // Create a menu subitem for each station
  const stationList =
    stations == undefined
      ? []
      : Object.entries(stations).sort((a, b) => {
          return a > b ? 1 : -1;
        });
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
          setIsPlaying("true");
          setCurrentStationName(stationName);
        }}
      />
    );
  });

  // Use primary genre color for livestream icon
  let iconColor = cachedIconColor;
  if (stations != undefined && currentStationName != undefined) {
    iconColor = colorMap[stations[currentStationName].genres[0]];
  }

  // Update cached icon color
  useEffect(() => {
    setCachedIconColor(iconColor);
  }, [iconColor]);

  return (
    <MenuBarExtra
      isLoading={stationList == undefined || stationList.length == 0}
      title={currentStationName}
      icon={isPlaying == "true" ? { source: Icon.Livestream, tintColor: iconColor } : Icon.LivestreamDisabled}
      tooltip={`Currently playing station: ${currentStationName}`}
    >
      <MenuBarExtra.Section title="Controls">
        {isPlaying == "true" ? (
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
