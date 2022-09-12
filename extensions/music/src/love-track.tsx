import { showHUD } from "@raycast/api";
import { love } from "./util/scripts/player-controls";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await handleTaskEitherError(love)();
  await showHUD("Track Loved");
};
