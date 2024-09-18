export type Prettify<T> = {
  [K in keyof T]: T[K];
} & NonNullable<unknown>;

export type OmitIntersection<O, I> = Prettify<Omit<O, keyof I> & I>;
