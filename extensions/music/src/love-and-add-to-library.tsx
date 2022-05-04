import { closeMainWindow } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";
import * as TE from "fp-ts/TaskEither";

export default async () => {
  await closeMainWindow();

  await pipe(
    music.currentTrack.love,
    TE.chain(() => music.currentTrack.addToLibrary),
    handleTaskEitherError
  )();
};
