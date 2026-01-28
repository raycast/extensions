import { ArrOrObjOrNull } from "../types";

// For a lot of endpoints, NameSilo will return (null | T | Array<T>) represented as ArrOrObjOrNull<T>
// where T is the object type
// ths function will returm the data as an Array so we can map
export function parseAsArray<T>(item: ArrOrObjOrNull<T> | undefined) {
  return !item ? [] : item instanceof Array ? item : [item];
}
