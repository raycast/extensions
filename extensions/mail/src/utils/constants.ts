import { homedir } from "os";
import { resolve } from "path";
import { getPersistenceInfo } from "../api/get-persistence-info";

export const getDbPath = async () => {
  const persistenceInfo = await getPersistenceInfo();
  return resolve(homedir(), "Library/Mail", persistenceInfo.LastUsedVersionDirectoryName, "MailData/Envelope Index");
};
