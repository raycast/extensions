import { pipe } from "fp-ts/lib/function";

import { getVolumeStep } from "./util/preferences";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await pipe(
    getVolumeStep(),
    music.player.volume.increase,
    handleTaskEitherError("Failed to increase volume", "Volume Up"),
  )();
};
