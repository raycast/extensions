import { Action, ActionPanel, closeMainWindow, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { flow, pipe } from "fp-ts/lib/function";
import * as A from "fp-ts/ReadonlyNonEmptyArray";
import * as TE from "fp-ts/TaskEither";

import { Playlist } from "./util/models";
import { parseResult } from "./util/parser";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

enum PlaylistKind {
  SUBSCRIPTION = "subscription",
  USER = "user",
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

export default function AddToPlaylist() {
  const { pop } = useNavigation();

  const { isLoading, data: playlists } = useCachedPromise(
    () =>
      pipe(
        music.playlists.getPlaylists(PlaylistKind.USER),
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

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search A Playlist">
      {Object.entries(playlists ?? {})
        .filter(([section]) => section !== "library")
        .map(([section, data]) => (
          <List.Section title={kindToString(section as PlaylistKind)} key={section}>
            {data.map((playlist) => (
              <List.Item
                key={playlist.id}
                title={playlist.name}
                accessories={[
                  {
                    icon: Icon.Music,
                    text: `${playlist.count}`,
                  },
                  {
                    icon: Icon.Clock,
                    text: `${Math.floor(Number(playlist.duration) / 60)} min`,
                  },
                ]}
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
      handleTaskEitherError("Could not add current track to this playlist", `Track added to playlist "${name}"`),
    )();

    pop();
  };

  return (
    <ActionPanel title={title1}>
      <Action title={title1} onAction={handleSubmit()} icon={Icon.PlusCircle} />
    </ActionPanel>
  );
}
