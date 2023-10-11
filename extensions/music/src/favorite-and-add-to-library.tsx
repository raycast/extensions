import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default pipe(
  music.currentTrack.favorite,
  TE.chain(() => pipe(music.currentTrack.addToLibrary)),
  handleTaskEitherError("Failed to save/favorite the track", "Favorited & added to library")
);
