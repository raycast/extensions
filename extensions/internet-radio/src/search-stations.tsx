import { Icon, List, LocalStorage, Color, Image, getPreferenceValues } from "@raycast/api";
import { getAllStations, loadDefaults } from "./utils";
import { getFavicon, useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import StationActionPanel from "./components/StationActionPanel";
import GenreDropdown from "./components/GenreDropdown";
import { StationListObject } from "./types";
import { colorMap } from "./genres";
import StationDetails from "./components/StationDetails";

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
  const [savedStations, setSavedStations] = useState<StationListObject>({});

  const preferences = getPreferenceValues<Preferences>();

  const { isLoading, data } = useFetch(
    "https://raw.githubusercontent.com/SKaplanOfficial/internet-radio/main/radio-stations.json"
  );

  // Load default stations, if necessary
  useEffect(() => {
    if (!isLoading) {
      loadDefaults().then(() => {
        const stationList = JSON.parse(data as string);
        setStations(stationList);
        getAllStations().then((savedStationList) => {
          setSavedStations(savedStationList);
        });
      });
    }
  }, [isLoading]);

  if (!stations) {
    return <List isLoading={true} />;
  }

  // Update state to reflect current play state
  LocalStorage.getItem("-is-playing").then((playStatus) => setIsPlaying(playStatus as boolean));
  LocalStorage.getItem("-current-station-name").then((stationName) => setCurrentStationName(stationName as string));
  LocalStorage.getItem("-current-track-id").then((trackID) => setCurrentTrackID(trackID as string));
  LocalStorage.getItem("-last-station-name").then((stationName) => setLastStationName(stationName as string));

  const filteredStations = Object.entries(stations)
    .sort(([a], [b]) => {
      return a.toLowerCase() > b.toLowerCase() ? 1 : -1;
    })
    .filter(([stationName, stationData]) => {
      let alreadySaved = false;
      Object.entries(savedStations).forEach(([savedStationName, savedStationData]) => {
        if (stationName == savedStationName && stationData.stream == savedStationData.stream) {
          alreadySaved = true;
          return;
        }
      });

      const matchesGenreSelection = genreSelection == "All Genres" || stationData.genres.includes(genreSelection);
      return !alreadySaved && !stationData.discontinued && matchesGenreSelection;
    });

  const listItems = filteredStations.map(([stationName, stationData]) => {
    if (stationName === "default") {
      return;
    }

    const accessories = [];
    if (currentStationName == stationName) {
      // Add "Now Playing" icon
      accessories.push({ icon: Icon.Play });
    } else if (!isPlaying && lastStationName == stationName) {
      // Add last played station indicator
      accessories.push({ text: "Last Played" });
    }

    // Add genre labels
    const tags = [];
    for (const genre of stationData.genres) {
      if (genre == "") continue;
      let tagColor = Color.SecondaryText;
      if (genre in colorMap) {
        tagColor = colorMap[genre];
      }
      tags.push(<List.Item.Detail.Metadata.TagList.Item text={genre} color={tagColor} key={genre} />);
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
        keywords={[...stationData.genres]}
        accessories={accessories}
        detail={<StationDetails stationName={stationName} data={stationData} tags={tags} />}
        actions={
          <StationActionPanel
            stationName={stationName}
            currentStationName={currentStationName}
            currentTrackID={currentTrackID}
            data={stationData}
            stations={stations}
            setStations={setStations}
            setSavedStations={setSavedStations}
            isPlaying={isPlaying}
            onActionStart={() => setWaitingForAction(true)}
            onActionFinish={() => setWaitingForAction(false)}
            onPlay={(trackID: string) => {
              setIsPlaying(true);
              setCurrentStationName(stationName);
              setCurrentTrackID(trackID);

              const stationInfo: StationListObject = {};
              stationInfo[stationName] = stationData;
              LocalStorage.setItem("-temp-station-info", JSON.stringify(stationInfo));
            }}
            onStop={() => {
              setIsPlaying(false);
              setCurrentStationName("");
              setCurrentTrackID("");
            }}
            allowModification={false}
            showDetails={true}
            setShowDetails={() => null}
          />
        }
      />
    );
  });

  return (
    <List
      isLoading={waitingForAction}
      searchBarPlaceholder={
        filteredStations.length > 1 ? `Search ${filteredStations.length} radio stations...` : "Search..."
      }
      searchBarAccessory={<GenreDropdown onGenreSelection={setGenreSelection} />}
      isShowingDetail={true}
    >
      <List.EmptyView icon={{ source: "no-view.png" }} title={`No radio stations found!`} />
      {listItems}
    </List>
  );
}
