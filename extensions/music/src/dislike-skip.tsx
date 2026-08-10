import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default pipe(
  music.currentTrack.dislike,
  TE.chain(() => pipe(music.player.next)),
  handleTaskEitherError("Failed to dislike/skip the track", "Disliked & skipped"),
);
