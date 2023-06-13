import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { SFSymbols } from "./util/models";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default pipe(
  music.currentTrack.love,
  TE.chain(() => pipe(music.currentTrack.addToLibrary)),
  handleTaskEitherError(
    SFSymbols.WARNING + " Failed to save/love the track",
    SFSymbols.LOVE + " Loved & added to library"
  )
);
