import { showHUD } from "@raycast/api";
import { love } from "./util/scripts/player-controls";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

export default async () => {
  await pipe(
    love,
    TE.map(() => showHUD("Track Loved")),
    TE.mapLeft(() => showHUD("Failed to Love Track"))
  )();
};
