import { LocalStorage } from "@raycast/api";
import { DIALECT_STORAGE_KEY } from "./constants";
import { SQLDialect } from "../types";

const VALID_DIALECTS: SQLDialect[] = ["postgres", "mysql", "sqlite", "tsql"];

export async function getPreferredDialect(): Promise<SQLDialect> {
  const stored = await LocalStorage.getItem<string>(DIALECT_STORAGE_KEY);
  if (stored && VALID_DIALECTS.includes(stored as SQLDialect)) {
    return stored as SQLDialect;
  }
  return "postgres";
}

export async function setPreferredDialect(dialect: SQLDialect): Promise<void> {
  await LocalStorage.setItem(DIALECT_STORAGE_KEY, dialect);
}
