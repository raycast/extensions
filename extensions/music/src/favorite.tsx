import { closeMainWindow } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";

import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await closeMainWindow();
  await pipe(music.currentTrack.favorite, handleTaskEitherError("Failed to favorite the track", "Favorited"))();
};
