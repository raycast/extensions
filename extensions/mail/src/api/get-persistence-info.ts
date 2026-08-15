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
  try {
    const data = await readFile(PERSISTENCE_INFO_PATH, "utf8");
    return plist.parse(data) as PersistenceInfo;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read Mail persistence info: ${message}`);
  }
}

export async function getDatabasePath(): Promise<string> {
  try {
    const persistenceInfo = await getPersistenceInfo();
    return resolve(homedir(), "Library/Mail", persistenceInfo.LastUsedVersionDirectoryName, "MailData/Envelope Index");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get Mail database path: ${message}`);
  }
}
