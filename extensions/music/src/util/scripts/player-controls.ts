import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";

import { runScript, tell } from "../apple-script";
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

const adjustVolume = (delta: number): TE.TaskEither<ScriptError, number> =>
  pipe(
    runScript(
      `tell application "Music"
        set nextVolume to (sound volume) + (${delta})
        if nextVolume < 0 then set nextVolume to 0
        if nextVolume > 100 then set nextVolume to 100
        set sound volume to nextVolume
        return sound volume
      end tell`,
      5_000,
    ),
    TE.map(Number),
  );
const getShuffleStatus = pipe(
  tell("Music", "get shuffle enabled"),
  TE.map((s) => s === "true"),
);
const setShuffleStatus = pipe(
  RTE.ask<boolean>(),
  RTE.chainTaskEitherK((isEnabled) => tell("Music", `set shuffle enabled to ${isEnabled.toString()}`)),
);

// Music can apply changes asynchronously. Only report success after reading the requested state back.
const toggleSetting = (property: "shuffle enabled" | "song repeat", on: "true" | "one", off: "false" | "off") =>
  pipe(
    runScript(`
      tell application "Music"
        set targetState to ${off}
        if ${property} is ${off} then set targetState to ${on}
        set ${property} to targetState
        repeat 20 times
          if ${property} is targetState then return (targetState is ${on}) as text
          delay 0.1
        end repeat
        error "Music did not confirm the ${property} change. Try again."
      end tell
    `),
    TE.map((status) => status.trim() === "true"),
  );

export const shuffle = {
  get: getShuffleStatus,
  set: setShuffleStatus,
  toggle: toggleSetting("shuffle enabled", "true", "false"),
};

export const volume = {
  set: setVolume,
  get: getVolume,
  decrease: (step = 10) => adjustVolume(-step),
  increase: (step = 10) => adjustVolume(step),
};

export const getPlayerState = pipe(
  tell("Music", "player state"),
  TE.map((state) => state as PlayerState),
);

const getRepeatStatus = pipe(
  tell("Music", "get song repeat"),
  TE.map((s) => s.trim() === "one" || s.trim() === "all"),
);

const setRepeatStatus = pipe(
  RTE.ask<boolean>(),
  RTE.chainTaskEitherK((isEnabled) => tell("Music", `set song repeat to ${isEnabled ? "one" : "off"}`)),
);

export const repeat = {
  get: getRepeatStatus,
  set: setRepeatStatus,
  toggle: toggleSetting("song repeat", "one", "off"),
};
