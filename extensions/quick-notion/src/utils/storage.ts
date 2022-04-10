import { UpsertedDatabase } from "./../types";
import { LocalStorage } from "@raycast/api";
import { Database } from "src/types";

/* Databaseに関する情報をJSONにしてLocalStorageに保存 */
export const upsertDatabase = async (database: Database): Promise<UpsertedDatabase> => {
  const id = database.id;
  const upsertedDatabase = { ...database, updatedAt: new Date().toLocaleString("ja-JP") };
  const json = JSON.stringify(upsertedDatabase);
  LocalStorage.setItem(id, json);
  return upsertedDatabase;
};
