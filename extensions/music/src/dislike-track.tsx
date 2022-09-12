import { showHUD } from "@raycast/api";
import { dislike } from "./util/scripts/player-controls";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await handleTaskEitherError(dislike)();
  await showHUD("Track Disliked");
};
