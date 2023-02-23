import { ObjectEntries } from "../types/global";

/** `Object.entries` with typed keys */
export function objectEntries<T extends object>(obj: T) {
  return Object.entries(obj) as ObjectEntries<T>;
}
