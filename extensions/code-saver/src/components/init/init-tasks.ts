import { None, Option, Some } from "ts-results-es";
import { DB_NAME, MIGRATIONS_FOLDER } from "../../lib/constants/db-name";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { GetDBInstance, UserDefinedDBPath } from "../../lib/storage/db-instance";
import { resolve } from "path";
import { environment, getPreferenceValues } from "@raycast/api";
import * as async_fs from "fs/promises";
import dayjs from "dayjs";

export type InitErrorMarkDown = string;
export type InitTaskFunc = () => Promise<Option<InitErrorMarkDown>>;

const newBackUpDBPath = `${UserDefinedDBPath}.${new Date().toLocaleDateString("en-CA")}`;

export const checkDBStorePath: InitTaskFunc = async () => {
  try {
    GetDBInstance();
  } catch (exc) {
    const errMarkdown = `# Failed to open SQLite DB file
The following steps may help to recover:
- make sure the folder you give exists
- make sure we can read and write \`${DB_NAME}\` under the folder you give
Error details are as follows:
\`\`\`
${exc instanceof Error ? exc.stack : String(exc)}
\`\`\`
`;
    return Some(errMarkdown);
  }
  return None;
};

export const backupDB: InitTaskFunc = async () => {
  try {
    await async_fs.copyFile(UserDefinedDBPath, newBackUpDBPath);
    const preferences = getPreferenceValues<Preferences>();
    const backupFileSuffixes = (await async_fs.readdir(preferences.dbFolder))
      // get file name with prefix DB_NAME
      .filter((file) => file.match(new RegExp(`${DB_NAME}\\.\\d{4}-\\d{2}-\\d{2}`)))
      // get the date suffix
      .map((file) => file.split(DB_NAME + ".").pop())
      // just in case, filter file name without date suffix
      // and it should be one valid date
      .filter((suffix) => suffix !== undefined && dayjs(suffix, "YYYY-MM-DD", true).isValid())
      // type transform
      .map((suffix) => suffix as string);
    console.log("backupFileSuffixes", backupFileSuffixes);
    console.log("backup keep policy", preferences.backupDates);
    const filesToBeDeleted = backupFileSuffixes
      .filter((date) => {
        let oldestDate: dayjs.Dayjs | null = null;
        switch (preferences.backupDates) {
          case "1Month":
            oldestDate = dayjs().subtract(1, "month");
            break;
          case "1Week":
            oldestDate = dayjs().subtract(1, "week");
            break;
          case "3Days":
            oldestDate = dayjs().subtract(3, "days");
            break;
          case "always":
            oldestDate = null;
            break;
          default:
            throw Error(`no logic for ${preferences.backupDates}`);
        }
        if (oldestDate == null) {
          // noone will be deleted
          return false;
        }
        return dayjs(date, "YYYY-MM-DD", true).isBefore(oldestDate);
      })
      .map((date) => `${UserDefinedDBPath}.${date}`);
    console.log("backup to be deleted", filesToBeDeleted);
    for (const file of filesToBeDeleted) {
      await async_fs.unlink(file);
    }
  } catch (exc) {
    const errMarkdown = `# Failed to backup the SQLite DB file
The following steps may help to recover:
- make sure we can read and write \`${DB_NAME}\` under the folder you give.
Error details are as follows:
\`\`\`
${exc instanceof Error ? exc.stack : String(exc)}
\`\`\`
`;
    return Some(errMarkdown);
  }
  return None;
};

export const upgradeDBSchema: InitTaskFunc = async () => {
  const db = GetDBInstance();
  try {
    migrate(db, { migrationsFolder: resolve(environment.assetsPath, MIGRATIONS_FOLDER) });
  } catch (exc) {
    const errMarkdown = `# Failed to upgrage SQLite DB schema
The following steps may help to recover:
- Please check the integrity of DB \`${UserDefinedDBPath}\`.
    - Is that modified manually by accident?
- You can recover with backup of DB \`${newBackUpDBPath}\`
Error details are as follows:
\`\`\`
${exc instanceof Error ? exc.stack : String(exc)}
\`\`\`
`;
    return Some(errMarkdown);
  }
  return None;
};
