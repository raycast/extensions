import { showToast, Toast } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as music from "./util/scripts";

export default async () => {
  await pipe(
    music.currentTrack.getCurrentTrack(),
    TE.map((track) => showToast(Toast.Style.Success, track.name, `${track.album} - ${track.artist}`)),
    TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not get currently playing track"))
  )();
};
