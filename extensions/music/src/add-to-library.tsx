import { pipe } from "fp-ts/lib/function";

import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default pipe(
  music.currentTrack.addToLibrary,
  handleTaskEitherError("Failed to Add to Library", "Added to library"),
);
