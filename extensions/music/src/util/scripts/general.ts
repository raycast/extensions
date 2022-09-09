import { pipe } from "fp-ts/lib/function";
import * as R from "fp-ts/Reader";
import * as RTE from "fp-ts/ReaderTaskEither";
import { tell } from "../apple-script";

export const setShuffle: RTE.ReaderTaskEither<boolean, Error, string> = pipe(
  R.ask<boolean>(),
  R.map((shuffle) => tell("Music", `set shuffle enabled to ${shuffle.toString()}`))
);
