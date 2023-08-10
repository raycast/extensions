import { pipe } from "fp-ts/lib/function";

import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

const dislikeAndSkipTrack = async () => {
  await pipe(
    music.currentTrack.dislike,
    handleTaskEitherError("Could not dislike the track", "Disliked")
  )();

  await pipe(music.player.next, handleTaskEitherError("Failed to skip track", "Track skipped"))();
};

export default dislikeAndSkipTrack;
