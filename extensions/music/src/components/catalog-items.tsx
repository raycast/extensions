import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";

import { SignOutAction } from "../util/apple-music-auth";
import { artworkUrl, getCatalogAlbum } from "../util/catalog-api";
import { CatalogAlbum, CatalogSong } from "../util/models";
import { AddToLibraryAction, OpenInMusicAction } from "./catalog-actions";

const LIST_ART = 160;

function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CatalogSongItem({ song, showAlbum = true }: { song: CatalogSong; showAlbum?: boolean }) {
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

export function CatalogAlbumItem({ album }: { album: CatalogAlbum }) {
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
          <ViewTracklistAction albumId={album.id} title={album.title} />
          {album.url && <CopyLinkAction url={album.url} />}
          <SignOutAction />
        </ActionPanel>
      }
    />
  );
}

export function ViewTracklistAction({ albumId, title }: { albumId: string; title: string }) {
  const { push } = useNavigation();
  return (
    <Action
      title="View Tracklist"
      icon={Icon.List}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onAction={() => push(<CatalogAlbumView albumId={albumId} title={title} />)}
    />
  );
}

export function CatalogAlbumView({ albumId, title }: { albumId: string; title: string }) {
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
export function CopyLinkAction({ url }: { url: string }) {
  return (
    <Action.CopyToClipboard title="Copy Link" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
  );
}
