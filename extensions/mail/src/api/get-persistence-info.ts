import { homedir } from "os";
import { resolve } from "path";
import { readFile } from "fs/promises";
import plist from "plist";

const PERSISTENCE_INFO_PATH = resolve(homedir(), "Library/Mail/PersistenceInfo.plist");

type PersistenceInfo = {
  LastUsedVersionDirectoryName: string;
  VersionDirectoryIdentifiers: Record<string, string>;
};

export async function getPersistenceInfo(): Promise<PersistenceInfo> {
  const data = await readFile(PERSISTENCE_INFO_PATH, "utf8");
  return plist.parse(data) as PersistenceInfo;
}
