import { showHUD } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { refreshCache, wait } from "./util/cache";
import { addToLibrary } from "./util/scripts/player-controls";

export default async () => {
  await pipe(
    addToLibrary,
    TE.map(async () => {
      showHUD("Added to Library");
      await wait(5);
      await refreshCache();
    }),
    TE.mapLeft(() => showHUD("Failed to Add to Library"))
  )();
};
