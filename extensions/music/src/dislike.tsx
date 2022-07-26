import { pipe } from 'fp-ts/lib/function';
import { hud } from './util/feedback';
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default async () => {
  await pipe(
    music.currentTrack.dislike,
    hud('✅ Track disliked'),
    handleTaskEitherError,
  )();
};
