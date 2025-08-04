import { LocalStorage } from "@raycast/api";
import Value = LocalStorage.Value;

export type UnknownRecord = Record<PropertyKey, unknown>;

export enum StorageKey {
  OWLS = "owls",
}

export type StructuredValue = UnknownRecord | UnknownRecord[];
export type StorageValue = Value | StructuredValue;
export type StorageValues = {
  [key: string]: StorageValue;
};
