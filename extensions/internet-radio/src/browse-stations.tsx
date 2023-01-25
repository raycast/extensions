import { ActionPanel, Action, Icon, List, LocalStorage, useNavigation, Color, showToast } from "@raycast/api";
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

export default function Command() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStationName, setCurrentStationName] = useState<string>("");
  const [currentTrackID, setCurrentTrackID] = useState<string>("");
  const [stations, setStations] = useState<{ [stationName: string]: { [key: string]: string | string[] } }>();
  const { push } = useNavigation();

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

  const stationList = Object.entries(stations);

  if (!stationList.length) {
    return <List isLoading={true} />;
  }

  LocalStorage.getItem("-is-playing").then((playStatus) => setIsPlaying(playStatus as boolean));
  LocalStorage.getItem("-current-station-name").then((stationName) => setCurrentStationName(stationName as string));
  LocalStorage.getItem("-current-track-id").then((trackID) => setCurrentTrackID(trackID as string));

  const listItems: JSX.Element[] = [];
  stationList.sort(([a], [b]) => {return a > b ? 1 : -1}).forEach(([stationName, stationData]) => {
    const tags = []

    if (currentStationName == stationName) {
      tags.push({ icon: Icon.Play })
    }

    for (const genre of stationData.genres) {
      if (genre == "") continue
      let tagColor = Color.SecondaryText
      if (genre in colorMap) {
        tagColor = colorMap[genre]
      }
      tags.push({ tag: { value: genre, color: tagColor}})
    }

    listItems.push(
      <List.Item
        key={stationName}
        icon={getFavicon(stationData.website as string)}
        title={stationName}
        accessories={tags}
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
                    showToast({ title: `Playing Station: ${stationName}` })
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

                      showToast({ title: `Stopped Station: ${currentStationName}` })
                    });
                  }}
                />
              ) : null}
            </ActionPanel.Section>

            <ActionPanel.Section>
              <Action.OpenInBrowser title="Open Stream In Browser" url={stationData.stream as string} />
              <Action.OpenInBrowser title="Open Website" url={stationData.website as string} />
              <Action.CopyToClipboard title="Copy Stream URL" content={stationData.stream as string} />
              <Action.CopyToClipboard title="Copy Website URL" content={stationData.website as string} />
            </ActionPanel.Section>

            <ActionPanel.Section>
              <Action
                title={"Delete Station"}
                style={Action.Style.Destructive}
                onAction={() => {
                  deleteTrack(undefined, `Raycast: ${stationName}`).then(() => {
                    deleteStation(stationName, stationData).then(() => {
                      getAllStations().then((stationList) => {
                        setStations(stationList);
                      });
                    })
                  })
                }}
              />

              <Action
                title={"Edit Station"}
                icon={Icon.Pencil}
                onAction={() => {
                  push(<EditStationForm stationName={stationName} stationData={stationData} setStations={setStations} />);
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  });

  return <List>{listItems}</List>;
}
