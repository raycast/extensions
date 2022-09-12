import { previous } from "./util/scripts/player-controls";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await handleTaskEitherError(previous)();
};
