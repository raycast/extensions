import { pipe } from "fp-ts/lib/function";

import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await pipe(music.currentTrack.favorite, handleTaskEitherError("Failed to favorite the track", "Favorited"))();
};
