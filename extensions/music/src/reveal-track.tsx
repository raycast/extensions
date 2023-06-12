import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { SFSymbols } from "./util/models";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

// Run both commands ignoring activate error
export default pipe(
  music.currentTrack.reveal,
  TE.apFirst(music.general.activate),
  handleTaskEitherError(SFSymbols.WARNING + " Could not display current track")
);
