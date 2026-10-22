import { pipe } from "fp-ts/lib/function";

import * as music from "./util/scripts";
import { withMenuBarRefresh } from "./util/menu-bar";
import { handleTaskEitherError } from "./util/utils";

export default pipe(
  music.player.previous,
  handleTaskEitherError("Failed to rewind track", "Track rewinded"),
  withMenuBarRefresh,
);
