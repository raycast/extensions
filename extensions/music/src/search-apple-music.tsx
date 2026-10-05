import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { useState } from "react";

import { AddToLibraryAction, OpenInMusicAction } from "./components/catalog-actions";
import { SignOutAction, withAppleMusicAuth } from "./util/apple-music-auth";
import { artworkUrl, CatalogSearchResults, getCatalogAlbum, searchCatalog } from "./util/catalog-api";
import { CatalogAlbum, CatalogSong } from "./util/models";

const LIST_ART = 160;
const EMPTY_RESULTS: CatalogSearchResults = { songs: [], albums: [] };

function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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

function CatalogSongItem({ song, showAlbum = true }: { song: CatalogSong; showAlbum?: boolean }) {
  const accessories: List.Item.Accessory[] = [];
  if (song.contentRating === "explicit") accessories.push({ tag: "E", tooltip: "Explicit" });
  if (showAlbum && song.album) accessories.push({ text: song.album });
  if (song.durationMs) accessories.push({ text: formatDuration(song.durationMs) });
  return (
    <List.Item
      icon={artworkUrl(song.artwork, LIST_ART) ?? Icon.Music}
      title={song.title}
      subtitle={song.artist}
      accessories={accessories}
      actions={
        <ActionPanel>
          <OpenInMusicAction url={song.url} />
          {song.playable && <AddToLibraryAction kind="songs" id={song.id} title={song.title} />}
          {song.url && <CopyLinkAction url={song.url} />}
          <SignOutAction />
        </ActionPanel>
      }
    />
  );
}

function CatalogAlbumItem({ album }: { album: CatalogAlbum }) {
  const { push } = useNavigation();
  const accessories: List.Item.Accessory[] = [];
  if (album.contentRating === "explicit") accessories.push({ tag: "E", tooltip: "Explicit" });
  if (album.releaseDate) accessories.push({ text: album.releaseDate.slice(0, 4) });
  accessories.push({ text: `${album.trackCount} Tracks` });
  return (
    <List.Item
      icon={artworkUrl(album.artwork, LIST_ART) ?? Icon.Cd}
      title={album.title}
      subtitle={album.artist}
      accessories={accessories}
      actions={
        <ActionPanel>
          <OpenInMusicAction url={album.url} />
          <AddToLibraryAction kind="albums" id={album.id} title={album.title} />
          <Action
            title="View Tracklist"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={() => push(<CatalogAlbumView albumId={album.id} title={album.title} />)}
          />
          {album.url && <CopyLinkAction url={album.url} />}
          <SignOutAction />
        </ActionPanel>
      }
    />
  );
}

function CatalogAlbumView({ albumId, title }: { albumId: string; title: string }) {
  const { data, isLoading } = usePromise(
    (id: string) =>
      pipe(
        getCatalogAlbum(id),
        TE.getOrElseW((error) => {
          showToast({ style: Toast.Style.Failure, title: "Could Not Load Album", message: error.message });
          return T.of(null);
        }),
      )(),
    [albumId],
  );

  return (
    <List isLoading={isLoading} navigationTitle={title}>
      {data && (
        <List.Section
          title={data.album.title}
          subtitle={`${data.album.artist}${data.album.releaseDate ? ` · ${data.album.releaseDate}` : ""}`}
        >
          {data.tracks.map((track) => (
            <CatalogSongItem key={track.id} song={track} showAlbum={false} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// ⌘C stays unbound by convention — copy actions use ⌘⇧C.
function CopyLinkAction({ url }: { url: string }) {
  return (
    <Action.CopyToClipboard title="Copy Link" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
  );
}

export default withAppleMusicAuth(SearchAppleMusic);
