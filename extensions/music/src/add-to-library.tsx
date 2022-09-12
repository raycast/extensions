import { showHUD } from "@raycast/api";
import { addToLibrary } from "./util/scripts/player-controls";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await handleTaskEitherError(addToLibrary)();
  await showHUD("Added to Library");
};
