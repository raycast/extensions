import { flow, pipe } from "fp-ts/function";
import * as A from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";

import { parseQueryString } from "./apple-script";

/**
 *
 * use to parse run-applescript return (string)
 * see start - `playlist.tsx` for a full example
 */
// prettier-ignore
export const parseResult = <T extends object>() => (raw: string): ReadonlyArray<T> => pipe(
  raw,
  S.trim,
  S.split("\n"),
  A.map(flow(
    S.trim,
    parseQueryString<T>()
  ))
);

/**
 *
 * Split number into N pieces, starting from 0
 *
 * @example divideNumber(100, 25) // => 0,25,50,75,100
 */
export const divideNumber = (num: number, step: number): number[] => {
  const arr: number[] = [];

  for (let i = 0; i <= num; i += step) {
    arr.push(i);
  }

  return arr;
};
