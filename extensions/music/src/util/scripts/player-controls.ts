import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { tell } from "../apple-script";
import { PlayerState } from "../models";

export const pause = tell("Music", "pause");
export const play = tell("Music", "play");
export const stop = tell("Music", "stop");
export const next = tell("Music", "next track");
export const previous = tell("Music", "previous track");
export const togglePlay = tell("Music", "playpause");

export const getPlayerState = pipe(
  tell("Music", "player state"),
  TE.map((state) => state as PlayerState)
);
