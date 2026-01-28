import * as O from "fp-ts/Option";

// If receives an empty string or null or undefined, it returns None
export const fromEmptyOrNullable = <T>(f?: T | null): O.Option<T> => {
  if (typeof f === "string" && f === "") return O.none;
  return O.fromNullable(f);
};
