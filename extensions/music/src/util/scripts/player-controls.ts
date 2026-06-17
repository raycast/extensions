import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";

import { tell } from "../apple-script";
import { PlayerState, ScriptError } from "../models";
import { minMax } from "../utils";

export const pause = tell("Music", "pause");
export const play = tell("Music", "play");
export const stop = tell("Music", "stop");
export const next = tell("Music", "next track");
export const previous = tell("Music", "previous track");
export const togglePlay = tell("Music", "playpause");

const setVolume = pipe(
  RTE.ask<number>(),
  RTE.map(minMax(0, 100)), // add bound to volume
  RTE.chainTaskEitherKW((volume) => tell("Music", `set sound volume to ${volume}`)),
);

const getVolume: TE.TaskEither<ScriptError, number> = pipe(tell("Music", "get sound volume"), TE.map(parseInt));
const getShuffleStatus = pipe(
  tell("Music", "get shuffle enabled"),
  TE.map((s) => s === "true"),
);
const setShuffleStatus = pipe(
  RTE.ask<boolean>(),
  RTE.chainTaskEitherK((isEnabled) => tell("Music", `set shuffle enabled to ${isEnabled.toString()}`)),
);

export const shuffle = {
  get: getShuffleStatus,
  set: setShuffleStatus,
  toggle: pipe(
    getShuffleStatus,
    TE.chain((enabled) => setShuffleStatus(!enabled)),
  ),
};

export const volume = {
  set: setVolume,
  get: getVolume,
  decrease: (step = 10) =>
    pipe(
      getVolume,
      TE.map((value) => value - step),
      TE.chain(setVolume),
    ),
  increase: (step = 10) =>
    pipe(
      getVolume,
      TE.map((value) => value + step),
      TE.chain(setVolume),
    ),
};

export const getPlayerState = pipe(
  tell("Music", "player state"),
  TE.map((state) => state as PlayerState),
);

const getRepeatStatus = pipe(
  tell("Music", "get song repeat"),
  TE.map((s) => s === "one"),
);

const setRepeatStatus = pipe(
  RTE.ask<boolean>(),
  RTE.chainTaskEitherK((isEnabled) => tell("Music", `set song repeat to ${isEnabled ? "one" : "off"}`)),
);

export const repeat = {
  get: getRepeatStatus,
  set: setRepeatStatus,
  toggle: pipe(
    getRepeatStatus,
    TE.chain((enabled) => setRepeatStatus(!enabled)),
  ),
};
