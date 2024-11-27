import { LocalStorage } from "@raycast/api";
import { UnknownRecord } from "./index";
import Value = LocalStorage.Value;

export const StorageKey = {
  REBOUNDS: "rebounds",
} as const;

export type StorageKeyType = (typeof StorageKey)[keyof typeof StorageKey];

export type StructuredValue = UnknownRecord | UnknownRecord[];
export type StorageValue = Value | StructuredValue;
