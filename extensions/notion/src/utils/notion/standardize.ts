/** Used to unwrap generics. For example, {@link Pick `Pick`}.  */
// eslint-disable-next-line @typescript-eslint/ban-types
type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Converts a mismatch union into a unified type.
 * - `UnionObject` can only have **single** mismatch property.
 * - `Key` must be a single constant string value.
 * ---
 * Example:
 * ```ts
 * type Animal = { type: 'cat', cat: string } | { type: 'dog', dog: number }
 * type StandardizedAnimal = Standardized<Animal, 'volume'> // { type: 'cat', value: string } | { type: 'dog', value: number }
 * ```
 */
export type Standardized<UnionObject extends { type: string }, NewKey extends string> = {
  [T in UnionObject as T["type"]]: Prettify<
    Pick<T, keyof UnionObject> & {
      [K in NewKey]: Omit<T, keyof UnionObject>[keyof Omit<T, keyof UnionObject>];
    }
  >;
}[UnionObject["type"]];

export function standardize<UO extends { type: string }, NewKey extends string>(
  object: UO,
  nonStandardKey: string,
  newKey: NewKey,
) {
  const newObject: Record<string, unknown> = {};
  for (const key in object)
    if (key == nonStandardKey) newObject[newKey] = object[key];
    else newObject[key] = object[key];
  return newObject as Standardized<UO, NewKey>;
}
