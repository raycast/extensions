import { flow, pipe } from "fp-ts/function";
import * as A from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";

import { parseQueryString } from "./apple-script";

// use to parse run-applescript return (string)
// see start-playlist.tsx for a full example
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
