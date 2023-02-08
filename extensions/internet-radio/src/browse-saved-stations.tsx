import { Icon, List, LocalStorage, Color, Image, getPreferenceValues } from "@raycast/api";
import { getAllStations, loadDefaults } from "./utils";
import { getFavicon } from "@raycast/utils";
import { useEffect, useState } from "react";
import StationActionPanel from "./components/StationActionPanel";
import GenreDropdown from "./components/GenreDropdown";
import { StationListObject } from "./types";
import { colorMap } from "./genres";

interface Preferences {
  showColoredIcon: boolean;
  showStationIcons: boolean;
}

export default function Command() {
  const [waitingForAction, setWaitingForAction] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStationName, setCurrentStationName] = useState<string>("");
  const [currentTrackID, setCurrentTrackID] = useState<string>("");
  const [lastStationName, setLastStationName] = useState<string>("");
  const [genreSelection, setGenreSelection] = useState<string>("All Genres");
  const [stations, setStations] = useState<StationListObject>();

  const preferences = getPreferenceValues<Preferences>();

  // Load default stations, if necessary
  useEffect(() => {
    loadDefaults().then(() => {
      getAllStations().then((stationList) => {
        setStations(stationList);
      });
    });
  }, []);

  if (!stations) {
    return <List isLoading={true} />;
  }

  // Update state to reflect current play state
  LocalStorage.getItem("-is-playing").then((playStatus) => setIsPlaying(playStatus as boolean));
  LocalStorage.getItem("-current-station-name").then((stationName) => setCurrentStationName(stationName as string));
  LocalStorage.getItem("-current-track-id").then((trackID) => setCurrentTrackID(trackID as string));
  LocalStorage.getItem("-last-station-name").then((stationName) => setLastStationName(stationName as string));

  const listItems = Object.entries(stations)
    .sort(([a], [b]) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1))
    .map(([stationName, stationData]) => {
      if (genreSelection != "All Genres" && !stationData.genres.includes(genreSelection)) {
        return;
      }

      const tags = [];
      if (currentStationName == stationName) {
        // Add "Now Playing" icon
        tags.push({ icon: Icon.Play });
      } else if (!isPlaying && lastStationName == stationName) {
        // Add last played station indicator
        tags.push({ text: "Last Played" });
      }

      // Add genre labels
      for (const genre of stationData.genres) {
        if (genre == "") continue;
        let tagColor = Color.SecondaryText;
        if (genre in colorMap) {
          tagColor = colorMap[genre];
        }
        tags.push({ tag: { value: genre, color: tagColor } });
      }

      let websiteIcon: Image.ImageLike = Icon.Link;
      if (
        stationData.website != "" &&
        (stationData.website as string).match(/[A-Za-z]+:\/\/[A-Za-z0-9\-_!+'"]+\.[A-Za-z0-9\-_:%&;?#/.=]+/g)
      ) {
        websiteIcon = getFavicon(stationData.website as string, { fallback: Icon.Link });
      }

      return (
        <List.Item
          key={stationName}
          icon={preferences.showStationIcons ? websiteIcon : undefined}
          title={stationName}
          accessories={tags}
          keywords={[...stationData.genres]}
          actions={
            <StationActionPanel
              stationName={stationName}
              currentStationName={currentStationName}
              currentTrackID={currentTrackID}
              data={stationData}
              stations={stations}
              setStations={setStations}
              isPlaying={isPlaying}
              onActionStart={() => setWaitingForAction(true)}
              onActionFinish={() => setWaitingForAction(false)}
              onPlay={(trackID: string) => {
                setIsPlaying(true);
                setCurrentStationName(stationName);
                setCurrentTrackID(trackID);
              }}
              onStop={() => {
                setIsPlaying(false);
                setCurrentStationName("");
                setCurrentTrackID("");
              }}
            />
          }
        />
      );
    });

  return (
    <List
      isLoading={waitingForAction}
      searchBarPlaceholder={`Search ${Object.entries(stations).length || ""} radio stations...`}
      searchBarAccessory={<GenreDropdown onGenreSelection={setGenreSelection} />}
    >
      <List.EmptyView icon={{ source: "no-view.png" }} title={`No radio stations found!`} />
      {listItems}
    </List>
  );
}
