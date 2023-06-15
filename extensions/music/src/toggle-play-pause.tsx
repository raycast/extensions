import { pipe } from "fp-ts/lib/function";

import { SFSymbols } from "./util/models";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default pipe(
  music.player.togglePlay,
  handleTaskEitherError(
    SFSymbols.WARNING + " Failed to toggle play/pause",
    SFSymbols.PLAYPAUSE + " Successfully played/paused"
  )
);
