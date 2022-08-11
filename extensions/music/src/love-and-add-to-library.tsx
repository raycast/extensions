import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { hud } from "./util/feedback";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await pipe(
    music.currentTrack.love,
    TE.chain(() => music.currentTrack.addToLibrary),
    hud("✅ Track loved & added to library"),
    handleTaskEitherError
  )();
};
