import { showToast, Toast } from "@raycast/api";
import { Database } from "sql.js";
import { existsSync, writeFileSync } from "node:fs";
import { useEffect, useState } from "react";
import { initiDb, populateDbFromApi } from "../lib/db";
import { DB_FILE_PATH } from "../constants";

if (!existsSync(DB_FILE_PATH)) {
  writeFileSync(DB_FILE_PATH, "", "utf8");
}
export const dumpDb = (db: Database) => {
  writeFileSync(DB_FILE_PATH, Buffer.from(db.export()));
};

export const useDatabase = () => {
  const [db, setDb] = useState<Database | null>();
  useEffect(() => {
    initiDb().then(async (client) => {
      const { hide } = await showToast(Toast.Style.Animated, "Refreshing...");
      client.run("BEGIN TRANSACTION");
      await populateDbFromApi(client, undefined);
      client.run("COMMIT TRANSACTION");
      hide();
      setDb(client);
    });
  }, []);

  useEffect(() => {
    if (!db) return;
    dumpDb(db);
    db.close();
    setDb(null);
  }, [db]);

  return db;
};
