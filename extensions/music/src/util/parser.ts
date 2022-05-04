import * as S from "fp-ts/string";
import * as A from "fp-ts/ReadonlyArray";
import { flow, pipe } from "fp-ts/function";

// prettier-ignore
const mapProperties = <T extends object>() =>(properties: ReadonlyArray<string>): T => pipe(
  properties,
  A.reduce({} as T, (acc, property: string) => {
    const [key, ...rest] = property.split(": ");
    const value = rest.join(": ");

    return {
      ...acc,
      [key]: value,
    };
  })
);

// use to parse run-applescript return (string)
// see start-playlist.tsx for a full example
// prettier-ignore
export const parseResult = <T extends object>() => (raw: string): ReadonlyArray<T> => pipe(
  raw,
  S.trim,
  S.split("\n"),
  A.map(flow(
    S.trim,
    S.split("&nbsp;"),
    mapProperties<T>()
  ))
);
