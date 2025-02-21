import { showToast, closeMainWindow, Toast } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import * as music from "./util/scripts";

export default async () => {
  closeMainWindow();

  await pipe(
    music.currentTrack.removeCurrentTrackFromCurrentPlaylist(),
    TE.map((track) =>
      showToast({
        style: Toast.Style.Success,
        title: `Removed "${track.name}" (${track.album} - ${track.artist}) from "${track.playlist}".`,
      }),
    ),
    TE.mapLeft(() =>
      showToast({ style: Toast.Style.Failure, title: "Error while removing current track from current playlist" }),
    ),
  )();
};
