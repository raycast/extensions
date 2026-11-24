import { ActionPanel, Color, Grid, Icon, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { useMemo } from "react";

import {
  AddToLibraryAction,
  OpenInMusicAction,
  PlayLibraryAlbumAction,
  PlayLibraryPlaylistAction,
  PlayLibrarySongAction,
} from "./components/catalog-actions";
import { CopyLinkAction, ViewTracklistAction } from "./components/catalog-items";
import { LibraryMembership, membershipGridAccessory, useLibraryMembership } from "./components/library-membership";
import { SignOutAction, withAppleMusicAuth } from "./util/apple-music-auth";
import { artworkUrl, getRecommendations, RecommendationRoom } from "./util/catalog-api";
import { CatalogAlbum, CatalogPlaylist, CatalogSong } from "./util/models";

const GRID_ART = 300;
const NO_ROOMS: RecommendationRoom[] = [];

function AlbumTile({ album, membership }: { album: CatalogAlbum; membership: LibraryMembership }) {
  const inLibrary = membership.inLibrary.has(album.id);
  return (
    <Grid.Item
      content={artworkUrl(album.artwork, GRID_ART) ?? Icon.Cd}
      title={album.title}
      subtitle={album.artist}
      accessory={membershipGridAccessory(album.id, membership)}
      actions={
        <ActionPanel>
          {inLibrary && <PlayLibraryAlbumAction album={album} />}
          {inLibrary && <PlayLibraryAlbumAction album={album} shuffle />}
          <OpenInMusicAction url={album.url} />
          <AddToLibraryAction
            kind="albums"
            id={album.id}
            title={album.title}
            onAdded={() => membership.markPending(album.id)}
          />
          <ViewTracklistAction albumId={album.id} title={album.title} />
          {album.url && <CopyLinkAction url={album.url} />}
          <SignOutAction />
        </ActionPanel>
      }
    />
  );
}

function PlaylistTile({ playlist, membership }: { playlist: CatalogPlaylist; membership: LibraryMembership }) {
  // A library-playlists resource is in the library by definition; a catalog
  // playlist is in it when the account's library playlists link to it. Both
  // sources also say whether it's the user's own playlist, which decides
  // which class of Music.app playlist to play and whether adding makes sense.
  const inLibrary = playlist.fromLibrary || membership.inLibrary.has(playlist.id);
  const own = playlist.fromLibrary || membership.ownPlaylistIds.has(playlist.id);
  const accessory = playlist.fromLibrary
    ? { icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "In Library" }
    : membershipGridAccessory(playlist.id, membership);
  return (
    <Grid.Item
      content={artworkUrl(playlist.artwork, GRID_ART) ?? Icon.List}
      title={playlist.title}
      subtitle={playlist.curator}
      accessory={accessory}
      actions={
        <ActionPanel>
          {inLibrary && (
            <>
              <PlayLibraryPlaylistAction playlist={playlist} own={own} />
              <PlayLibraryPlaylistAction playlist={playlist} own={own} shuffle />
            </>
          )}
          <OpenInMusicAction url={playlist.url} />
          {!own && (
            <AddToLibraryAction
              kind="playlists"
              id={playlist.id}
              title={playlist.title}
              onAdded={() => membership.markPending(playlist.id)}
            />
          )}
          {playlist.url && <CopyLinkAction url={playlist.url} />}
          <SignOutAction />
        </ActionPanel>
      }
    />
  );
}

function SongTile({ song, membership }: { song: CatalogSong; membership: LibraryMembership }) {
  return (
    <Grid.Item
      content={artworkUrl(song.artwork, GRID_ART) ?? Icon.Music}
      title={song.title}
      subtitle={song.artist}
      accessory={membershipGridAccessory(song.id, membership)}
      actions={
        <ActionPanel>
          {membership.inLibrary.has(song.id) && <PlayLibrarySongAction song={song} />}
          <OpenInMusicAction url={song.url} />
          {song.playable && (
            <AddToLibraryAction
              kind="songs"
              id={song.id}
              title={song.title}
              onAdded={() => membership.markPending(song.id)}
            />
          )}
          {song.url && <CopyLinkAction url={song.url} />}
          <SignOutAction />
        </ActionPanel>
      }
    />
  );
}

function RoomSection({ room, membership }: { room: RecommendationRoom; membership: LibraryMembership }) {
  const count = room.albums.length + room.playlists.length + room.songs.length;
  return (
    <Grid.Section title={room.title || "For You"} subtitle={`${count}`}>
      {room.albums.map((album) => (
        <AlbumTile key={album.id} album={album} membership={membership} />
      ))}
      {room.playlists.map((playlist) => (
        <PlaylistTile key={playlist.id} playlist={playlist} membership={membership} />
      ))}
      {room.songs.map((song) => (
        <SongTile key={song.id} song={song} membership={membership} />
      ))}
    </Grid.Section>
  );
}

function ViewRecommendations() {
  const { data: rooms, isLoading } = usePromise(() =>
    pipe(
      getRecommendations(),
      TE.getOrElseW((error) => {
        showToast({ style: Toast.Style.Failure, title: "Could Not Load Recommendations", message: error.message });
        return T.of(NO_ROOMS);
      }),
    )(),
  );

  const albumIds = useMemo(() => (rooms ?? []).flatMap((room) => room.albums.map((album) => album.id)), [rooms]);
  const songIds = useMemo(() => (rooms ?? []).flatMap((room) => room.songs.map((song) => song.id)), [rooms]);
  const playlistIds = useMemo(
    () => (rooms ?? []).flatMap((room) => room.playlists.filter((p) => !p.fromLibrary).map((p) => p.id)),
    [rooms],
  );
  const membership = useLibraryMembership(albumIds, songIds, playlistIds);

  return (
    <Grid isLoading={isLoading} columns={5} searchBarPlaceholder="Filter recommendations">
      {!isLoading && rooms?.length === 0 && (
        <Grid.EmptyView
          title="No Recommendations"
          description="Apple Music has no recommendations for this account yet."
          icon={Icon.Stars}
        />
      )}
      {(rooms ?? []).map((room) => (
        <RoomSection key={room.id} room={room} membership={membership} />
      ))}
    </Grid>
  );
}

export default withAppleMusicAuth(ViewRecommendations);
