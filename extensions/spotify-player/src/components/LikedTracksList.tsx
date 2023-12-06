import { useState } from "react";
import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useYourLibrary } from "../hooks/useYourLibrary";
import TrackListItem from "./TrackListItem";
import { useMe } from "../hooks/useMe";

export function LikedTracksList() {
  const [searchText, setSearchText] = useState("");
  const library = useYourLibrary();
  const { meData } = useMe();
  const {
    data: tracks,
    isLoading,
    pagination,
  } = usePromise((searchText) => library.searchTracks(searchText), [searchText]);

  const playingContext = meData?.id ? `spotify:user:${meData.id}:collection` : undefined;

  return (
    <List
      searchBarPlaceholder="Search your liked songs"
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      pagination={pagination}
    >
      {tracks?.map((track, index) => (
        <TrackListItem
          key={`${track.id}${index}`}
          playingContext={playingContext}
          track={track}
          album={track.album}
          showGoToAlbum
          showAddToSaved
        />
      ))}
    </List>
  );
}
