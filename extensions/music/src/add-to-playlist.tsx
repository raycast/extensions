import { Action, ActionPanel, closeMainWindow, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { flow, pipe } from "fp-ts/lib/function";
import * as A from "fp-ts/ReadonlyNonEmptyArray";
import * as TE from "fp-ts/TaskEither";
import { useEffect, useState } from "react";

import { Playlist } from "./util/models";
import { SFSymbols } from "./util/models";
import { parseResult } from "./util/parser";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

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
  const [playlists, setPlaylists] = useState<PlaylistSections | null>(null);
  const { pop } = useNavigation();

  useEffect(() => {
    pipe(
      PlaylistKind.USER,
      music.playlists.getPlaylists,
      TE.mapLeft((e) => {
        console.error(e);
        showToast(Toast.Style.Failure, "Could not get your playlists");
      }),
      TE.map(
        flow(
          parseResult<Playlist>(),
          (data) => A.groupBy<Playlist>((playlist) => playlist.kind?.split(" ")?.[0] ?? "Other")(data),
          setPlaylists
        )
      )
    )();
  }, []);

  return (
    <List isLoading={playlists === null} searchBarPlaceholder="Search A Playlist">
      {Object.entries(playlists ?? {})
        .filter(([section]) => section !== "library")
        .map(([section, data]) => (
          <List.Section title={kindToString(section as PlaylistKind)} key={section}>
            {data.map((playlist) => (
              <List.Item
                key={playlist.id}
                title={playlist.name}
                accessoryTitle={
                  SFSymbols.PLAYLIST +
                  ` ${playlist.count}   ` +
                  SFSymbols.TIME +
                  ` ${Math.floor(Number(playlist.duration) / 60)} min`
                }
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

function Actions({ playlist: { name }, pop }: ActionsProps) {
  const title1 = `Add to Playlist "${name}"`;

  const handleSubmit = () => async () => {
    await pipe(
      name,
      music.currentTrack.addToPlaylist,
      TE.map(() => closeMainWindow()),
      handleTaskEitherError(
        SFSymbols.WARNING + " Could not add current track to this playlist",
        `${SFSymbols.ADD_TO_LIBRARY} Track added to playlist "${name}"`
      )
    )();

    pop();
  };

  return (
    <ActionPanel title={title1}>
      <Action title={title1} onAction={handleSubmit()} icon={Icon.PlusCircle} />
    </ActionPanel>
  );
}
