import * as TE from "fp-ts/TaskEither";

// Re-Export the library defaults before extending it.
export * from "fp-ts/TaskEither";

// it executes the callback `fn` whitout changing the output.
// useful for logging.
export const tap =
  <E, T>(fn?: (data: T) => void) =>
  (te: TE.TaskEither<E, T>) =>
    TE.map<T, T>((d) => {
      fn?.(d);
      return d;
    })(te);

// it executes the callback `fn` whitout changing the output.
// useful for logging.
export const tapLeft =
  <E, T>(fn?: (data: E) => void) =>
  (te: TE.TaskEither<E, T>) =>
    TE.mapLeft<E, E>((d) => {
      fn?.(d);
      return d;
    })(te);
