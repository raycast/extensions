import {
  ActionPanel,
  Action,
  Icon,
  List,
  LocalStorage,
  useNavigation,
  Color,
  showToast,
  confirmAlert,
  Alert,
  Image,
  getPreferenceValues,
} from "@raycast/api";
import {
  deleteStation,
  deleteTrack,
  EditStationForm,
  getAllStations,
  loadDefaults,
  pausePlayback,
  playStation,
  colorMap,
} from "./utils";
import { getFavicon } from "@raycast/utils";
import { useEffect, useState } from "react";

interface Preferences {
  showColoredIcon: boolean;
  showStationIcons: boolean;
}

function GenreDropdown(props: { onGenreSelection: React.Dispatch<React.SetStateAction<string | undefined>> }) {
  const { onGenreSelection } = props;
  return (
    <List.Dropdown tooltip="Select Genre" onChange={(genreSelection) => onGenreSelection(genreSelection)}>
      <List.Dropdown.Item key="All Genres" title="All Genres" value="All Genres" />
      {Object.entries(colorMap).map(([genre, genreColor]) => (
        <List.Dropdown.Item
          key={genre}
          title={genre}
          value={genre}
          icon={{ source: Icon.Circle, tintColor: genreColor }}
        />
      ))}
    </List.Dropdown>
  );
}

export default function Command() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStationName, setCurrentStationName] = useState<string>("");
  const [currentTrackID, setCurrentTrackID] = useState<string>("");
  const [lastStationName, setLastStationName] = useState<string>("");
  const [genreSelection, setGenreSelection] = useState<string | undefined>();
  const [stations, setStations] = useState<{ [stationName: string]: { [key: string]: string | string[] } }>();
  const { push } = useNavigation();

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

  const listItems: JSX.Element[] = [];
  Object.entries(stations)
    .sort(([a], [b]) => {
      return a > b ? 1 : -1;
    })
    .forEach(([stationName, stationData]) => {
      const tags = [];

      if (
        genreSelection != undefined &&
        genreSelection != "All Genres" &&
        !stationData.genres.includes(genreSelection)
      ) {
        return;
      }

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
      if (stationData.website != "") {
        websiteIcon = getFavicon(stationData.website as string, { fallback: Icon.Link });
      }

      listItems.push(
        <List.Item
          key={stationName}
          icon={preferences.showStationIcons ? websiteIcon : undefined}
          title={stationName}
          accessories={tags}
          keywords={[...stationData.genres]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {!isPlaying || currentStationName != stationName ? (
                  <Action
                    title={"Stream with Music"}
                    icon={Icon.Play}
                    onAction={() => {
                      playStation(stationName, stationData.stream as unknown as string).then((stationID) => {
                        setIsPlaying(true);
                        setCurrentStationName(stationName);
                        setCurrentTrackID(stationID);
                      });
                      showToast({ title: "Playing Station", message: stationName });
                    }}
                  />
                ) : null}

                {isPlaying && currentStationName == stationName ? (
                  <Action
                    title={"Stop Playback"}
                    icon={Icon.Stop}
                    onAction={() => {
                      pausePlayback().then(() => {
                        deleteTrack(currentTrackID);

                        setIsPlaying(false);
                        setCurrentStationName("");
                        setCurrentTrackID("");

                        showToast({ title: "Stopped Station", message: currentStationName });
                      });
                    }}
                  />
                ) : null}
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open Stream In Browser" url={stationData.stream as string} />
                {stationData.website ? (
                  <Action.OpenInBrowser title="Open Website" url={stationData.website as string} />
                ) : null}
                <Action.CopyToClipboard title="Copy Stream URL" content={stationData.stream as string} />
                {stationData.website ? (
                  <Action.CopyToClipboard title="Copy Website URL" content={stationData.website as string} />
                ) : null}
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action
                  title={"Delete Station"}
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  onAction={() => {
                    deleteTrack(undefined, `Raycast: ${stationName}`).then(async () => {
                      if (
                        await confirmAlert({
                          title: "Are you sure?",
                          primaryAction: {
                            title: "Delete",
                            style: Alert.ActionStyle.Destructive,
                          },
                        })
                      ) {
                        await deleteStation(stationName, stationData);
                        const stationList = await getAllStations();
                        setStations(stationList);
                      }
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />

                <Action
                  title={"Edit Station"}
                  icon={Icon.Pencil}
                  onAction={() => {
                    push(
                      <EditStationForm stationName={stationName} stationData={stationData} setStations={setStations} />
                    );
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      );
    });

  return (
    <List
      searchBarPlaceholder={`Search ${Object.entries(stations).length || ""} radio stations...`}
      searchBarAccessory={<GenreDropdown onGenreSelection={setGenreSelection} />}
    >
      <List.EmptyView icon={{ source: "no-view.png" }} title={`No ${null} radio stations found!`} />
      {listItems}
    </List>
  );
}
