export type MapValues<T, NewType> = {
  [P in keyof T]: NewType;
};

export type RequiredWith<T, K extends keyof T> = T & { [P in K]-?: T[P] };
