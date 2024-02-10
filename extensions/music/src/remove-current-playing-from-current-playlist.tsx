import { showHUD } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import * as music from "./util/scripts";
import { Track } from "./util/models";

export default async () => {
  await pipe(
    music.currentTrack.removeCurrentTrackFromCurrentPlaylist(),
    TE.map((track: Track) => showHUD(`Removed "${track.name}" (${track.artist}) from current playlist.`)),
    TE.mapLeft(() => showHUD("Error while removing current track from current playlist"))
  )();
};
