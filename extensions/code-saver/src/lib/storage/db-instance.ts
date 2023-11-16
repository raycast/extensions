import { getPreferenceValues, environment } from "@raycast/api";
import { resolve } from "path";
import { arch } from "os";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3-multiple-ciphers";
import { DB_NAME, X64_BINDING, ARM_BINDING } from "../constants/db-name";
import { SnippetModel, SnippetModelRelations } from "../../schema/snippet";
import { LibraryModel, LibraryModelRelations } from "../../schema/library";
import { LabelModel, LabelModelRelations } from "../../schema/label";
import { SnippetLabelModel, SnippetLabelModelRelations } from "../../schema/snippet-label";

export const UserDefinedDBPath = (function () {
  const preferences = getPreferenceValues<Preferences>();
  const dbFileAbsPath = resolve(preferences.dbFolder, DB_NAME);
  return dbFileAbsPath;
})();

export const GetDBInstance = () => {
  const isX64 = arch() == "x64";
  const sqlite = new Database(UserDefinedDBPath, {
    nativeBinding: resolve(environment.assetsPath, isX64 ? X64_BINDING : ARM_BINDING),
  });
  const preferences = getPreferenceValues<Preferences>();
  sqlite.pragma(`cipher='aes256cbc'`);
  sqlite.pragma(`key='${preferences.encryptedKey}'`);
  return drizzle(sqlite, {
    schema: {
      SnippetModel,
      LibraryModel,
      LabelModel,
      SnippetModelRelations,
      LabelModelRelations,
      LibraryModelRelations,
      SnippetLabelModel,
      SnippetLabelModelRelations,
    },
  });
};
