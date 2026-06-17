import { pipe } from "fp-ts/lib/function";
import * as R from "fp-ts/Reader";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";

import { tell } from "../apple-script";
import { ScriptError } from "../models";

export const activate = tell("Music", "activate");

// TODO: Move to [`player-controls.tsx`]
/**
 *
 * Set shuffle status
 */
export const setShuffle: RTE.ReaderTaskEither<boolean, ScriptError, string> = pipe(
  R.ask<boolean>(),
  R.map((shuffle) => tell("Music", `set shuffle enabled to ${shuffle.toString()}`)),
);

export const getLibraryName = pipe(
  tell("Music", "get name of source 1"),
  TE.orElse((err) => {
    console.error(err);
    // fallback to "Library"
    return TE.right("Library");
  }),
);
