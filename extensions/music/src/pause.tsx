import { pipe } from "fp-ts/lib/function";

import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default pipe(music.player.pause, handleTaskEitherError("Failed to pause playback", "Playback paused"));
