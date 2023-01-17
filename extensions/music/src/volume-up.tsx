import { pipe } from "fp-ts/lib/function";

import { SFSymbols } from "./util/models";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await pipe(
    music.player.volume.increase,
    handleTaskEitherError(SFSymbols.WARNING + " Failed to increase volume", SFSymbols.SPEAKER_FILL + " Volume Up")
  )();
};
