/**
 * Converts Notion's mismatch union types into a standardized unified types.
 * - `UnionObject` can only have one mismatch property.
 * - `NewKey` must be a single constant string value.
 * - This type work recursivley on any any object with a `type` property.
 * ---
 * Example:
 * ```ts
 * // Notion's mismatch property type
 * type Prop = { type: 'checkbox', checkbox: boolean } | { type: 'url', url: string }
 * // Standardized unified type
 * type StandardizedAnimal = Standardized<Animal, 'volume'>
 * // { type: 'cat', value: string } | { type: 'dog', value: number }
 * ```
 */
export type Standardized<UnionObject extends { type: string }, NewKey extends string> = {
  // Loop through union types
  [Obj in UnionObject as Obj["type"]]: Prettify<
    Pick<Obj, keyof UnionObject> & {
      // Standardize mismatch property name
      [K in NewKey]: Omit<Obj, keyof UnionObject>[keyof Omit<Obj, keyof UnionObject>] extends { type: string }
        ? Standardized<Omit<Obj, keyof UnionObject>[keyof Omit<Obj, keyof UnionObject>], NewKey>
        : Omit<Obj, keyof UnionObject>[keyof Omit<Obj, keyof UnionObject>];
    }
  >;
}[UnionObject["type"]];

/**
 * Convert an object from notion's syntax of denoting object types into a more type friendly syntax.
 *
 * Notion's syntax:
 * ```js
 * [{ type: "checkbox", checkbox: boolean }
 * { type: "url": url: string }]
 * ```
 *
 * Converted syntax:
 * ```js
 * [{ type: "checkbox", [newKey]: boolean }
 * { type: "url": [newKey]: string }]
 * ```
 */
export function standardize<UnionObject extends { type: string }, NewKey extends string>(
  object: UnionObject,
  newKey: NewKey,
): Standardized<UnionObject, NewKey> {
  return recursiveStandardize(object, newKey) as Standardized<UnionObject, NewKey>;
}
function recursiveStandardize(object: unknown, newKey: string) {
  if (isTyped(object)) {
    const newObject: Record<string, unknown> = {};
    for (const key in object)
      if (key == object.type) newObject[newKey] = recursiveStandardize(object[key], newKey);
      else newObject[key] = object[key];
    return newObject;
  } else return object;
}

/** Check if value matches Notion's syntax of denoting object types. */
function isTyped<T extends string>(value: unknown): value is { type: T } & { [K in T]: unknown } {
  return (
    typeof value == "object" && // is object
    value !== null && // not null
    "type" in value && // object has key `type`
    typeof value["type"] == "string" && // value of property `key` is string
    value["type"] in value // object has key matching value of  property `key`
  );
}

/** Used to unwrap generics. For example, {@link Pick `Pick`}.  */
// eslint-disable-next-line @typescript-eslint/ban-types
type Prettify<T> = { [K in keyof T]: T[K] } & {};
