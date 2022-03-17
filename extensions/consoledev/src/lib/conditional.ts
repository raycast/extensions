import * as O from "fp-ts/Option";

export const is = (condition: boolean): O.Option<null> => (condition ? O.some(null) : O.none);
