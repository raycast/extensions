import { Action, Icon, ActionPanel, closeMainWindow, showToast, Toast, useNavigation } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { useState } from "react";

import { PlaylistList } from "./components/playlist-list";
import { Playlist, PlaylistKind } from "./util/models";
import * as music from "./util/scripts";

export default function PlaySelected() {
  const [playlistKind, setPlaylistKind] = useState(PlaylistKind.ALL);
  const { pop } = useNavigation();
  return (
    <PlaylistList
      kind={playlistKind}
      onKindChange={setPlaylistKind}
      getAccessories={(playlist) => [
        { text: `${playlist.count} songs · ${Math.floor(Number(playlist.duration) / 60)} min` },
      ]}
      renderActions={(playlist) => <Actions playlist={playlist} pop={pop} />}
    />
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
