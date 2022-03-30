import * as S from "fp-ts/string";
import * as R from "fp-ts/Reader";
import * as O from "fp-ts/Option";
import { pipe } from "fp-ts/function";

import * as N from "./number";
import { is } from "./conditional";

export const length = (str: string): number => str.length;
export const append =
  (b: string) =>
  (a: string): string =>
    a + b;
export const truncate = (maxLength: number): R.Reader<string, string> =>
  pipe(
    R.ask<string>(),
    R.map((str) =>
      pipe(
        str,
        length,
        N.gt(maxLength),
        is,
        O.fold(
          () => str,
          () => pipe(str, S.slice(0, maxLength), S.trim, append("..."))
        )
      )
    )
  );
