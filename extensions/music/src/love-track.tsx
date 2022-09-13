import { showHUD } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { love } from "./util/scripts/player-controls";

export default async () => {
  await pipe(
    love,
    TE.map(() => showHUD("Track Loved")),
    TE.mapLeft(() => showHUD("Failed to Love Track"))
  )();
};
