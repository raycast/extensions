import { pipe } from "fp-ts/lib/function";

import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default pipe(music.player.play, handleTaskEitherError("Failed to start playback", "Playback started"));
