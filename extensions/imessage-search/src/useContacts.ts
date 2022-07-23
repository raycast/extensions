import { homedir } from "os";
import { statSync, readdirSync } from "fs";
import { resolve } from "path";
import { useCallback } from "react";

import { useSqlite } from "./useSql";

const APP_PATH = "/Library/Application Support/AddressBook";
const DB_NAME = "AddressBook-v22.abcddb";

export interface Contact {
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly phoneNumber: string;
  readonly thumbnailData: Uint8Array | null;
}

export const findAddressBookDbPath = () => {
  // @note Apple Address Book seems to maintain two SQLite databases with the one
  // that has data being stored under `Source/<guid>`
  //
  // @note this doesn't seem to contain any data but is fine for a fallback....
  const home = homedir();
  const fallbackPath = `${home}${APP_PATH}/${DB_NAME}`;
  const basePath = `${home}${APP_PATH}/Sources`;
  const files = readdirSync(basePath);
  const dbFolder = files.find((file) => statSync(resolve(basePath, file)).isDirectory());

  if (!dbFolder) {
    return fallbackPath;
  }

  return resolve(basePath, dbFolder, DB_NAME);
};

export const useContacts = (dbPath: string) => {
  const { db, isLoading, error } = useSqlite(dbPath);

  const find = useCallback((handleId: string): Contact | null => {
    if (!db.current) {
      return null;
    }

    const query = `
    SELECT
      ZABCDPHONENUMBER.ZFULLNUMBER as phoneNumber,
      ZABCDRECORD.ZFIRSTNAME as firstName,
      ZABCDRECORD.ZLASTNAME as lastName,
      ZABCDRECORD.ZIMAGETYPE as imageType,
      ZABCDRECORD.ZIMAGEREFERENCE as avatarUrl,
      ZABCDRECORD.ZTHUMBNAILIMAGEDATA as thumbnailData
    FROM ZABCDRECORD
    LEFT JOIN ZABCDPHONENUMBER
      ON ZABCDRECORD.ROWID = ZABCDPHONENUMBER.ZOWNER
      WHERE ZABCDPHONENUMBER.ZFULLNUMBER = '${handleId}'
    LIMIT 1
    `;

    const newResults = new Array<Contact>();
    const statement = db.current.prepare(query);

    while (statement.step()) {
      newResults.push(statement.getAsObject() as unknown as Contact);
    }
    statement.free();

    return newResults.at(0) ?? null;
  }, []);

  return {
    error,
    isLoading,
    find,
  };
};
