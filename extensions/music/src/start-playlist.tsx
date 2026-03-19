import { Action, ActionPanel, closeMainWindow, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { flow, pipe } from "fp-ts/lib/function";
import * as A from "fp-ts/ReadonlyNonEmptyArray";
import * as TE from "fp-ts/TaskEither";
import { useMemo, useState } from "react";

import { Playlist } from "./util/models";
import { parseResult } from "./util/parser";
import * as music from "./util/scripts";
import { PlaylistKind } from "./util/scripts/playlists";

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

const kindToPlaylistClass: Record<PlaylistKind, string | null> = {
  [PlaylistKind.ALL]: null,
  [PlaylistKind.USER]: "user",
  [PlaylistKind.SUBSCRIPTION]: "subscription",
};

export default function PlaySelected() {
  const [playlistKind, setPlaylistKind] = useState<PlaylistKind>(PlaylistKind.ALL);
  const { pop } = useNavigation();

  const { isLoading, data: allPlaylists } = useCachedPromise(
    () =>
      pipe(
        music.playlists.getPlaylists(PlaylistKind.ALL),
        TE.map(
          flow(parseResult<Playlist>(), (data) =>
            A.groupBy<Playlist>((playlist) => playlist.kind?.split(" ")?.[0] ?? "Other")(data),
          ),
        ),
        TE.matchW(
          (e) => {
            console.error(e);
            showToast(Toast.Style.Failure, "Could not get your playlists");
            return {} as PlaylistSections;
          },
          (data) => data,
        ),
      )(),
    [],
    { keepPreviousData: true },
  );

  const filteredPlaylists = useMemo(() => {
    if (!allPlaylists) return {};
    const filterClass = kindToPlaylistClass[playlistKind];
    if (!filterClass) return allPlaylists;

    return Object.fromEntries(
      Object.entries(allPlaylists).filter(([section]) => section === filterClass),
    ) as PlaylistSections;
  }, [allPlaylists, playlistKind]);

  return (
    <List
      isLoading={isLoading}
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
      {Object.entries(filteredPlaylists)
        .filter(([section]) => section !== "library")
        .map(([section, data]) => (
          <List.Section title={kindToString(section as PlaylistKind)} key={section}>
            {data.map((playlist) => (
              <List.Item
                key={playlist.id}
                title={playlist.name ?? "Unknown Playlist"}
                accessories={[{ text: `${playlist.count} songs · ${Math.floor(Number(playlist.duration) / 60)} min` }]}
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
  const title1 = `Start Playlist "${name}"`;
  const title2 = `Shuffle Playlist "${name}"`;

  const handleSubmit = (shuffle?: boolean) => async () => {
    await pipe(
      id,
      music.playlists.playById(shuffle),
      TE.map(() => closeMainWindow()),
      TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not play this playlist")),
    )();

    pop();
  };

  return (
    <ActionPanel title={title1}>
      <Action title={title1} onAction={handleSubmit(false)} icon={Icon.Play} />
      <Action title={title2} onAction={handleSubmit(true)} icon={Icon.Shuffle} />
    </ActionPanel>
  );
}
