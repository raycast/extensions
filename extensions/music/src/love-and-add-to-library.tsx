import { closeMainWindow } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";
import * as TE from "fp-ts/TaskEither";
import { hud } from './util/feedback';

export default async () => {
  await pipe(
    music.currentTrack.love,
    TE.chain(() => music.currentTrack.addToLibrary),
    hud('✅ Track loved & added to library'),
    handleTaskEitherError
  )();
};
