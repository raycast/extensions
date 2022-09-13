import { showHUD } from "@raycast/api";
import { addToLibrary } from "./util/scripts/player-controls";
import { refreshCache, wait } from "./util/cache";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

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
