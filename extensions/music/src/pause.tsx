import { pipe } from "fp-ts/lib/function";

import { SFSymbols } from "./util/models";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default pipe(
  music.player.pause,
  handleTaskEitherError(SFSymbols.WARNING + " Failed to pause playback", SFSymbols.PAUSE + " Playback paused")
);
