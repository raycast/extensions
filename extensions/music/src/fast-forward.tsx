import { pipe } from "fp-ts/lib/function";

import { getSeekSeconds } from "./util/preferences";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  const seconds = getSeekSeconds();
  await pipe(
    music.player.position.fastForward(seconds),
    handleTaskEitherError("Failed to fast forward", `Fast Forwarded ${seconds} Seconds`),
  )();
};
