import { Action, ActionPanel, closeMainWindow, Icon, useNavigation } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { PlaylistList } from "./components/playlist-list";
import { Playlist, PlaylistKind } from "./util/models";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default function AddToPlaylist() {
  const { pop } = useNavigation();
  return (
    <PlaylistList kind={PlaylistKind.USER} renderActions={(playlist) => <Actions playlist={playlist} pop={pop} />} />
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
      TE.chainFirstIOK(() => () => pop()),
      TE.chainFirstTaskK(() => () => closeMainWindow()),
      handleTaskEitherError("Could not add current track to this playlist", `Track added to playlist "${name}"`),
    )();
  };

  return (
    <ActionPanel title={title1}>
      <Action title={title1} onAction={handleSubmit()} icon={Icon.PlusCircle} />
    </ActionPanel>
  );
}
