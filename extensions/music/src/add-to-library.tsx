import { pipe } from "fp-ts/lib/function";

import { hud } from "./util/feedback";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default pipe(
  music.currentTrack.addToLibrary,
  hud(`✅ Added to library`),
  handleTaskEitherError("Failed to Add to Library", "Added to library")
)();
