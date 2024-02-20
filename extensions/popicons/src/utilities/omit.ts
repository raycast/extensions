import { Prettify } from "./types/prettify";

/**
 * Omit properties from an object
 * @param obj - Object to omit properties from
 * @param keys - Keys to omit
 * @returns A new object with the omitted properties
 *
 * @example
 * const obj = {
 *   foo: "bar",
 *   baz: "qux",
 * };
 *
 * const omitted = omit(obj, ["foo"]); // { baz: "qux" }
 */
function omit<T, K extends keyof T>(obj: T, keys: K[]): Prettify<Omit<T, K>> {
  const result = { ...obj };

  for (const key of keys) {
    delete result[key];
  }

  return result;
}

export default omit;
