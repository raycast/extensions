import { closeMainWindow } from "@raycast/api";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await closeMainWindow();
  await handleTaskEitherError(music.currentTrack.addToLibrary)();
};
