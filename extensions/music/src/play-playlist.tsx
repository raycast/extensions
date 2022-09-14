import { Grid, List, Action, ActionPanel, closeMainWindow, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { useEffect, useState } from "react";

import { PlaylistTracks } from "./playlist-tracks";
import {
  ListOrGrid,
  ListOrGridDropdown,
  ListOrGridDropdownItem,
  ListOrGridSection,
  gridItemSize,
  LayoutType,
  mainLayout,
} from "./util/list-or-grid";
import { Playlist, PlaylistKind } from "./util/models";
import { Icons } from "./util/presets";
import * as music from "./util/scripts";

const kindToString = (kind: PlaylistKind) => {
  switch (kind) {
    case PlaylistKind.SUBSCRIPTION:
      return "Apple Music";
    case PlaylistKind.USER:
    case PlaylistKind.LIBRARY:
      return "Your Library";
    default:
      return kind;
  }
};

export default function PlayPlaylist() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistKind, setPlaylistKind] = useState<PlaylistKind>(PlaylistKind.ALL);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { pop } = useNavigation();

  useEffect(() => {
    const loadPlaylists = async () => {
      setPlaylists(await music.playlists.getPlaylists());
      setIsLoading(false);
    };
    loadPlaylists();
    return () => {
      setPlaylists([]);
    };
  }, []);

  return (
    <ListOrGrid
      itemSize={gridItemSize}
      isLoading={isLoading}
      searchBarPlaceholder="Search a playlist"
      searchBarAccessory={
        <ListOrGridDropdown
          tooltip="Playlist Kind"
          value={playlistKind}
          defaultValue={PlaylistKind.ALL}
          onChange={(s) => setPlaylistKind(s as PlaylistKind)}
        >
          <ListOrGridDropdownItem title="All Playlists" value={PlaylistKind.ALL} />
          <ListOrGridDropdownItem title="User Playlists" value={PlaylistKind.USER} />
          <ListOrGridDropdownItem title="Apple Music" value={PlaylistKind.SUBSCRIPTION} />
        </ListOrGridDropdown>
      }
    >
      {Array.from(
        new Set(
          playlists.filter((p) => playlistKind === PlaylistKind.ALL || p.kind === playlistKind).map((p) => p.kind)
        )
      ).map((section: string) => (
        <ListOrGridSection title={kindToString(section as PlaylistKind)} key={section}>
          {playlists
            .filter((playlist) => playlist.kind === section)
            .map((playlist) =>
              mainLayout === LayoutType.Grid ? (
                <Grid.Item
                  key={playlist.id}
                  title={playlist.name}
                  content={playlist.artwork || "../assets/no-playlist.png"}
                  subtitle={`${playlist.count} tracks`}
                  actions={<Actions playlist={playlist} pop={pop} />}
                />
              ) : (
                <List.Item
                  key={playlist.id}
                  title={playlist.name}
                  icon={playlist.artwork || "../assets/no-playlist.png"}
                  accessories={[{ text: `${playlist.count} tracks` }]}
                  actions={<Actions playlist={playlist} pop={pop} />}
                />
              )
            )}
        </ListOrGridSection>
      ))}
    </ListOrGrid>
  );
}

interface ActionsProps {
  playlist: Playlist;
  pop(): void;
}

function Actions({ playlist: { id }, pop }: ActionsProps) {
  const playPlaylist = (shuffle?: boolean) => async () => {
    await pipe(
      id,
      music.playlists.playById(shuffle),
      TE.map(() => closeMainWindow()),
      TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not play this playlist"))
    )();
    pop();
  };

  const showPlaylist = async () => {
    await pipe(
      id,
      music.playlists.showPlaylist,
      TE.map(() => closeMainWindow()),
      TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not find this playlist"))
    )();
  };

  return (
    <ActionPanel>
      <Action title="Start Playlist" icon={Icon.Play} onAction={playPlaylist(false)} />
      <Action title="Shuffle Playlist" icon={Icon.Shuffle} onAction={playPlaylist(true)} />
      <ActionPanel.Section>
        <Action.Push
          title="Show Playlist Tracks"
          icon={Icon.BulletPoints}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          target={<PlaylistTracks id={id} />}
        />
        <Action
          title="Show in Apple Music"
          icon={Icons.Music}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          onAction={showPlaylist}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
