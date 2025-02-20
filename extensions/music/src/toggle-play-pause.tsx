import { pipe } from "fp-ts/lib/function";

import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default pipe(
  music.player.togglePlay,
  handleTaskEitherError("Failed to toggle play/pause", "Successfully played/paused"),
);
