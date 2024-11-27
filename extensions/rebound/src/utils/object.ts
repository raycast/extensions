import { UnknownRecord } from "../types";

export function isObjectEquals<T extends UnknownRecord>(object: T, other: T): boolean {
  if (Object.keys(object).length !== Object.keys(other).length) {
    return false;
  }

  return Object.keys(object).every((key) => object[key] === other[key]);
}
