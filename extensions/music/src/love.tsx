import { pipe } from "fp-ts/lib/function";

import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await pipe(music.currentTrack.love, handleTaskEitherError("Failed to love the track", "Loved"))();
};
