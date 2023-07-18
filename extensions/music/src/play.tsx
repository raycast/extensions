import { pipe } from "fp-ts/lib/function";

import { SFSymbols } from "./util/models";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default pipe(
  music.player.play,
  handleTaskEitherError(SFSymbols.WARNING + " Failed to start playback", SFSymbols.PLAY_FILL + " Playback started")
);
