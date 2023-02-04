import { pipe } from "fp-ts/lib/function";

import { SFSymbols } from "./util/models";
import { getVolumeStep } from "./util/preferences";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await pipe(
    getVolumeStep(),
    music.player.volume.decrease,
    handleTaskEitherError(
      SFSymbols.WARNING + " Failed to decrease volume",
      SFSymbols.SPEAKER_FILL_MINUS + " Volume Down"
    )
  )();
};
