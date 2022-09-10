import { showHUD } from "@raycast/api";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await handleTaskEitherError(music.player.addToLibrary)();
  await showHUD("Added to Library");
};
