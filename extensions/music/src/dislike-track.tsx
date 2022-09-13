import { showHUD } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { dislike } from "./util/scripts/player-controls";

export default async () => {
  await pipe(
    dislike,
    TE.map(() => showHUD("Track Disliked")),
    TE.mapLeft(() => showHUD("Failed to Dislike Track"))
  )();
};
