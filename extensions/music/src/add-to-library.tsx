import { showHUD } from "@raycast/api";
import { refreshCache, wait } from "./util/cache";
import { addToLibrary } from "./util/scripts/player-controls";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await handleTaskEitherError(addToLibrary)();
  await showHUD("Added to Library");
  await wait(5);
  await refreshCache();
};
