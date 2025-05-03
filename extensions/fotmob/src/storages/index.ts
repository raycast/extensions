import { LocalStorage } from "@raycast/api";
import type { SchemaKeys, SchemaValue } from "./schema";

export async function getItem<K extends SchemaKeys>(key: K) {
  type RawValueType = SchemaValue<typeof key>;
  const stringValue = await LocalStorage.getItem<string>(key);
  if (stringValue == null) {
    return null;
  }
  return JSON.parse(stringValue) as RawValueType;
}

export async function setItem<K extends SchemaKeys>(key: K, value: SchemaValue<typeof key>) {
  const strVallue = JSON.stringify(value);
  await LocalStorage.setItem(key, strVallue);
}

export async function removeItem(key: SchemaKeys) {
  await LocalStorage.removeItem(key);
}
