import { pipe } from "fp-ts/lib/function";

import { SFSymbols } from "./util/models";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await pipe(
    music.currentTrack.dislike,
    handleTaskEitherError(SFSymbols.WARNING + " Could not dislike the track", SFSymbols.DISLIKE + " Disliked")
  )();
};
