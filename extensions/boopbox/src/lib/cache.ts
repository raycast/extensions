import { LocalStorage, environment } from "@raycast/api";
import { Catalog } from "@repo/domain";
import * as Schema from "effect/Schema";
import * as fs from "node:fs";
import * as path from "node:path";

const CATALOG_KEY = "catalog";

const soundsDir = () => path.join(environment.supportPath, "sounds");

export const readCachedCatalog = async (): Promise<Catalog | null> => {
  const raw = await LocalStorage.getItem<string>(CATALOG_KEY);
  if (raw == null) return null;
  try {
    const json = JSON.parse(raw);
    return Schema.decodeUnknownSync(Catalog)(json);
  } catch {
    return null;
  }
};

export const writeCachedCatalog = async (catalog: Catalog): Promise<void> => {
  await LocalStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
};

export const soundFilePath = (filename: string): string => path.join(soundsDir(), filename);

export const soundFileExists = (filename: string): boolean => {
  try {
    return fs.statSync(soundFilePath(filename)).isFile();
  } catch {
    return false;
  }
};

export const writeSoundFile = (filename: string, data: ArrayBuffer): void => {
  const dir = soundsDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(soundFilePath(filename), Buffer.from(data));
};

export const getMissingSounds = (filenames: readonly string[]): string[] =>
  filenames.filter((f) => !soundFileExists(f));
