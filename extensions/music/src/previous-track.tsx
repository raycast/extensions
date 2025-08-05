import { pipe } from "fp-ts/lib/function";

import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default pipe(music.player.previous, handleTaskEitherError("Failed to rewind track", "Track rewinded"));
