import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

// Run both commands ignoring activate error
export default pipe(
  music.currentTrack.reveal,
  TE.apFirst(music.general.activate),
  handleTaskEitherError("Could not display current track"),
);
