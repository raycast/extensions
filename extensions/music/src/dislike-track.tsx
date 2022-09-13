import { showHUD } from "@raycast/api";
import { dislike } from "./util/scripts/player-controls";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

export default async () => {
  await pipe(
    dislike,
    TE.map(() => showHUD("Track Disliked")),
    TE.mapLeft(() => showHUD("Failed to Dislike Track"))
  )();
};
