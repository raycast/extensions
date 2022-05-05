import { Action, ActionPanel, closeMainWindow, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { flow, pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { useEffect, useState } from "react";
import { Playlist } from "./util/models";
import { parseResult } from "./util/parser";
import * as music from "./util/scripts";
import * as A from "fp-ts/ReadonlyNonEmptyArray";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

enum PlaylistKind {
  ALL = "all",
  USER = "user",
  SUBSCRIPTION = "subscription",
}

type PlaylistSections = Readonly<Record<string, A.ReadonlyNonEmptyArray<Playlist>>>;

const kindToString = (kind: PlaylistKind) => {
  switch (kind) {
    case PlaylistKind.SUBSCRIPTION:
      return "Apple Music";
    case PlaylistKind.USER:
      return "Your Library";
    default:
      return kind;
  }
};

export default function PlaySelected() {
  const [playlistKind, setPlaylistKind] = useState<PlaylistKind>(PlaylistKind.ALL);
  const [playlists, setPlaylists] = useState<PlaylistSections | null>(null);
  const { pop } = useNavigation();

  useEffect(() => {
    pipe(
      playlistKind,
      music.playlists.getPlaylists,
      TE.mapLeft((_) => showToast(Toast.Style.Failure, "Could not get your playlists")),
      TE.map(
        flow(
          parseResult<Playlist>(),
          (data) => A.groupBy<Playlist>((playlist) => playlist.kind.split(" ")[0])(data),
          setPlaylists
        )
      )
    )();
  }, [playlistKind]);

  return (
    <List
      isLoading={playlists === null}
      searchBarPlaceholder="Search A Playlist"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Playlist Kind"
          value={playlistKind}
          defaultValue={PlaylistKind.ALL}
          onChange={(s) => setPlaylistKind(s as PlaylistKind)}
        >
          <List.Dropdown.Item title="All" value={PlaylistKind.ALL} />
          <List.Dropdown.Item title="User" value={PlaylistKind.USER} />
          <List.Dropdown.Item title="Apple Music" value={PlaylistKind.SUBSCRIPTION} />
        </List.Dropdown>
      }
    >
      {Object.entries(playlists ?? {})
        .filter(([section]) => section !== "library")
        .map(([section, data]) => (
          <List.Section title={kindToString(section as PlaylistKind)} key={section}>
            {data.map((playlist) => (
              <List.Item
                key={playlist.id}
                title={playlist.name}
                accessoryTitle={`🎧 ${playlist.count}  ⏱ ${Math.floor(Number(playlist.duration) / 60)} min`}
                icon={{ source: "../assets/icon.png" }}
                actions={<Actions playlist={playlist} pop={pop} />}
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}

interface ActionsProps {
  playlist: Playlist;
  pop(): void;
}

function Actions({ playlist: { name, id }, pop }: ActionsProps) {
  const title = `Start Playlist "${name}"`;

  const handleSubmit = async () => {
    await pipe(
      id,
      music.playlists.playById,
      TE.map(() => closeMainWindow()),
      TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not play this playlist"))
    )();

    pop();
  };

  return (
    <ActionPanel title={title}>
      <Action title={title} onAction={handleSubmit} />
    </ActionPanel>
  );
}
