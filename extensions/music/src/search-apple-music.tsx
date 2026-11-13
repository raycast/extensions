import { Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { useState } from "react";

import { CatalogAlbumItem, CatalogSongItem } from "./components/catalog-items";
import { withAppleMusicAuth } from "./util/apple-music-auth";
import { CatalogSearchResults, searchCatalog } from "./util/catalog-api";

const EMPTY_RESULTS: CatalogSearchResults = { songs: [], albums: [] };

function SearchAppleMusic() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = usePromise(
    (query: string) =>
      pipe(
        searchCatalog(query),
        TE.getOrElseW((error) => {
          showToast({ style: Toast.Style.Failure, title: "Search Failed", message: error.message });
          return T.of(EMPTY_RESULTS);
        }),
      )(),
    [searchText],
    { execute: searchText.length > 0 },
  );

  const albums = data?.albums ?? [];
  const songs = data?.songs ?? [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Apple Music for songs and albums"
      onSearchTextChange={setSearchText}
      throttle
    >
      {!searchText ? (
        <List.EmptyView
          title="Search Apple Music"
          description="Type to search the catalog for songs and albums"
          icon={Icon.Music}
        />
      ) : (
        <>
          {albums.length > 0 && (
            <List.Section title="Albums" subtitle={`${albums.length}`}>
              {albums.map((album) => (
                <CatalogAlbumItem key={album.id} album={album} />
              ))}
            </List.Section>
          )}
          {songs.length > 0 && (
            <List.Section title="Songs" subtitle={`${songs.length}`}>
              {songs.map((song) => (
                <CatalogSongItem key={song.id} song={song} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

export default withAppleMusicAuth(SearchAppleMusic);
