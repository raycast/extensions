import { pipe } from 'fp-ts/lib/function';
import { hud } from './util/feedback';
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await pipe(
    music.currentTrack.addToLibrary,
    hud(`✅ Added to library`),
    handleTaskEitherError,
  )()
};
