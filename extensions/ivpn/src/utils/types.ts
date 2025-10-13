export type UnionToIntersection<T> = (T extends any ? (x: T) => void : never) extends (x: infer U) => void ? U : never;

export type GetKeysByValueType<T, ValueType> = {
  [K in keyof T]: T[K] extends ValueType ? K : never;
}[keyof T];
