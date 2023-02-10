import { pipe } from "fp-ts/lib/function";

import { SFSymbols } from "./util/models";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await pipe(
    music.currentTrack.love,
    handleTaskEitherError(SFSymbols.WARNING + " Failed to love the track", SFSymbols.LOVE + " Loved")
  )();
};
