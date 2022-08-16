import { List, showToast, Toast } from "@raycast/api";
import _ from "lodash";
import { useEffect, useState } from "react";
import ArtistListItem from "./components/ArtistListItem";
import { useArtistsSearch } from "./spotify/client";
import { isSpotifyInstalled } from "./utils";

export default function SearchArtists() {
  const [searchText, setSearchText] = useState<string>();
  const response = useArtistsSearch(searchText);

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }

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
      searchBarPlaceholder="Search artists..."
      onSearchTextChange={setSearchText}
      isLoading={response.isLoading}
      throttle
      isShowingDetail={!_(response.result?.artists.items).isEmpty()}
    >
      {response.result?.artists.items.map((t: SpotifyApi.ArtistObjectFull) => (
        <ArtistListItem key={t.id} artist={t} spotifyInstalled={spotifyInstalled} />
      ))}
    </List>
  );
}
