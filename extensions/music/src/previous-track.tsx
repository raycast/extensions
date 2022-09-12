import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await handleTaskEitherError(music.player.previous)();
};
