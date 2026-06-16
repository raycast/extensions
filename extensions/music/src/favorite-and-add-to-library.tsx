import { closeMainWindow } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await closeMainWindow();
  await pipe(
    music.currentTrack.favorite,
    TE.chainW(() => pipe(music.currentTrack.addToLibrary)),
    handleTaskEitherError("Failed to save/favorite the track", "Favorited & added to library"),
  )();
};
