import { showHUD } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { refreshCache, wait } from "./util/cache";
import * as music from "./util/scripts";

export default async () => {
  await pipe(
    music.player.deleteFromLibrary,
    TE.map(async () => {
      showHUD("Deleted from Library");
      await wait(5);
      await refreshCache();
    }),
    TE.mapLeft(() => showHUD("Failed to Delete from Library"))
  )();
};
