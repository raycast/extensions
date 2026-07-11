import { Toast, open, popToRoot, showHUD, showToast } from "@raycast/api";
import { exec } from "child_process";
import { open_Url_InChrome } from "./utils-open";
import { get_pref_apachePort } from "./utils-preference";
import { getCurrentFormattedTime } from "./utils-time";
import mysql from "mysql";
import { Dispatch, SetStateAction } from "react";

export const system_db = ["performance_schema", "information_schema", "mydb", "mysql", "sys"];

export function sort_db(db_a: string, db_b: string): number {
  // First check if db_a/db_b is system db
  if (system_db.includes(db_a)) {
    return +1;
  }
  // Then compare the name
  if (db_a < db_b) {
    return -1;
  } else if (db_a > db_b) {
    return +1;
  } else {
    return 0;
  }
}

export async function get_databases(
  set_dbList: Dispatch<SetStateAction<string[]>>,
  set_isLoading: Dispatch<SetStateAction<boolean>>,
  set_error: Dispatch<SetStateAction<boolean>>
): Promise<boolean> {
  try {
    // Configure your MySQL connection settings
    const connection = mysql.createConnection({
      port: 8889,
      host: "localhost",
      user: "root",
      password: "root",
      socketPath: "/Applications/MAMP/tmp/mysql/mysql.sock",
      // database   : "_asbfeo_d10_"
    });

    // Establish connection and retrive the databases
    connection.connect((err: Error) => {
      if (err) {
        set_isLoading(false);
        set_error(true);
        return false;
      }
    });

    connection.query("SHOW DATABASES;", (err, result: { Database: string }[]) => {
      if (err instanceof Error) {
        connection.end();
        set_isLoading(false);
        set_error(true);
        return false;
      } else {
        const temp_dbs: string[] = [];
        for (let i: number = 0; i < result.length; i++) {
          const _RoWDataPacket_: { Database: string } = result[i];
          const _Database_: string = _RoWDataPacket_["Database"];
          temp_dbs.push(_Database_);
        }
        set_isLoading(false);
        set_dbList(temp_dbs);
        connection.end();
      }
    });

    return true;
  } catch (error) {
    if (error instanceof Error) {
      set_isLoading(false);
      set_error(true);
    }
    return false;
  }
}

export async function export_database(db: string, openAfter: boolean = false) {
  if (system_db.includes(db)) {
    await showHUD("⚠️ Error: exporting system database");
    popToRoot();
  }
  try {
    const export_folder = "~/Downloads";
    const export_file = getCurrentFormattedTime() + "-[" + db + "].sql";
    const export_path = export_folder + "/" + export_file;
    const export_cmd = `/Applications/MAMP/Library/bin/mysqldump -u root -proot ${db} > ${export_path}`;
    exec(export_cmd, (err) => {
      if (err) {
        showHUD("Failure exporting database: " + err);
      }
      if (openAfter) {
        open(export_folder);
      }
      showHUD("Successfully exported datbase: " + db);
      popToRoot();
    });
  } catch (error) {
    await showHUD("⚠️ Failure exporting database: " + db);
    popToRoot();
  }
}

export async function create_database(db: string, openAfter: boolean = false) {
  if (system_db.includes(db)) {
    await showHUD("⚠️ Error: creating system database");
    popToRoot();
  }
  try {
    const cmd = `/Applications/MAMP/Library/bin/mysql -u root -proot -e "CREATE DATABASE ${db}"`;
    exec(cmd, (err) => {
      if (err) {
        showHUD("Failure create database: " + err);
      }
      if (openAfter) {
        open_Url_InChrome("http://localhost:" + get_pref_apachePort() + "/phpMyAdmin5/");
      }
      showHUD("Successfully created datbase: " + db);
      popToRoot();
    });
  } catch (error) {
    await showHUD("⚠️ Failure creating DB: " + db);
    popToRoot();
  }
}

export async function delete_database(db: string) {
  if (system_db.includes(db)) {
    await showHUD("⚠️ Error: deleting system database");
    popToRoot();
  }
  try {
    const cmd = `/Applications/MAMP/Library/bin/mysql -u root -proot -e "DROP DATABASE ${db}"`;
    exec(cmd, (err) => {
      if (err) {
        showHUD("Failure delete database: " + err);
      }
      showHUD("Successfully deleted datbase: " + db);
      popToRoot();
    });
  } catch (error) {
    await showHUD("⚠️ Failure delete DB: " + db);
    popToRoot();
  }
}

export async function import_database(db: string, path: string) {
  if (system_db.includes(db)) {
    await showHUD("⚠️ Error: importing to system database");
    popToRoot();
  }
  try {
    const cmd_1 = `/Applications/MAMP/Library/bin/mysql -u root -proot -e "DROP DATABASE ${db}"`;
    const cmd_2 = `/Applications/MAMP/Library/bin/mysql -u root -proot -e "CREATE DATABASE ${db}"`;
    const cmd_3 = `/Applications/MAMP/Library/bin/mysql -u root -proot ${db} < "${path}"`;
    exec(cmd_1, (err) => {
      showToast({
        title: "Deleting Existing Database",
        style: Toast.Style.Animated,
      });
      if (err) {
        showHUD("⚠️ Failure deleting database: " + db);
        return;
      } else {
        showToast({
          title: "Creating Empty Database",
          style: Toast.Style.Animated,
        });
        exec(cmd_2, (err) => {
          if (err) {
            showHUD("⚠️ Failure creating database: " + db);
            return;
          } else {
            showToast({
              title: "Importing Database",
              style: Toast.Style.Animated,
            });
            exec(cmd_3, (err) => {
              if (err) {
                showHUD("⚠️ Failure importing database: " + db);
                return;
              } else {
                showHUD("SUCCESS");
                popToRoot();
              }
            });
          }
        });
      }
    });
  } catch (error) {
    await showHUD("⚠️ Failure importing DB: " + db);
    popToRoot();
  }
}
