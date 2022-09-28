import { List, showToast, Toast } from "@raycast/api";
import _ from "lodash";
import { useEffect, useState } from "react";
import TrackListItem from "./components/TrackListItem";
import { useTrackSearch } from "./spotify/client";
import { isSpotifyInstalled } from "./utils";

export default function SearchTracks() {
  const [searchText, setSearchText] = useState<string>();
  const response = useTrackSearch(searchText);

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }
  return (
    <TracksList
      tracks={response.result?.tracks.items}
      isLoading={response.isLoading}
      searchCallback={setSearchText}
      includeDetails
    />
  );
}

export function TracksList(props: {
  tracks: SpotifyApi.TrackObjectFull[] | undefined;
  isLoading?: boolean;
  searchCallback?: (text: string) => void;
  includeDetails?: boolean;
}) {
  const [spotifyInstalled, setSpotifyInstalled] = useState<boolean>(false);
  useEffect(() => {
    async function checkForSpotify() {
      const spotifyIsInstalled = await isSpotifyInstalled();

      setSpotifyInstalled(spotifyIsInstalled);
    }

    checkForSpotify();
  }, []);

  return (
    <List
      navigationTitle="Search Tracks"
      searchBarPlaceholder="Search music by keywords..."
      onSearchTextChange={props.searchCallback}
      isLoading={props.isLoading}
      throttle
      isShowingDetail={props.includeDetails && !_(props.tracks).isEmpty()}
    >
      {props.tracks &&
        props.tracks
          .sort((t) => t.popularity)
          .map((t: SpotifyApi.TrackObjectFull) => (
            <TrackListItem key={t.id} track={t} album={t.album} spotifyInstalled={spotifyInstalled} />
          ))}
    </List>
  );
}
