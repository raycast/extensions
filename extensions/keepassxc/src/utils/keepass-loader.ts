import { getPreferenceValues, LocalStorage, Toast, showToast } from "@raycast/api";
import { parse } from "csv-parse/sync";
import path from "path";
import child_process from "child_process";

interface Preference {
  keepassxcRootPath: {
    name: string;
    path: string;
    bundleId: string;
  };
  database: string;
}

/**
 * Utility function to show a toast message for CLI errors.
 * @param {Object} e - Error object with a `message` property.
 * @returns {void}
 *
 * Takes the error message from the CLI and shows a toast message with a human-readable description.
 * If the error is due to an invalid preference, the toast message will be "Invalid Preference: <preference name>".
 */
const showToastCliErrors = (e: { message: string }) => {
  let invalidPreference = "";
  let toastMessage = e.message.trim();
  if (e.message.includes("Invalid credentials were provided") || e.message.includes("Failed to load key file")) {
    toastMessage = "Invalid Credentials";
  } else if (e.message.includes("keepassxc-cli: No such file or directory") || e.message.includes("ENOENT")) {
    invalidPreference = "KeePassXC App";
  } else if (
    e.message.includes("Failed to open database file") ||
    e.message.includes("Error while reading the database: Not a KeePass database")
  ) {
    invalidPreference = "KeePass Database";
  }
  if (invalidPreference !== "") {
    toastMessage = `Invalid Preference: ${invalidPreference}`;
  }
  showToast(Toast.Style.Failure, "Error", toastMessage);
};

class KeePassLoader {
  private static database: string;
  private static databasePassword: string;
  private static keepassxcCli: string | undefined;
  private static keyFile: string;
  private static spawn = child_process.spawn;
  static {
    const preferences: Preference = getPreferenceValues();
    this.database = preferences.database;
    this.keepassxcCli = preferences.keepassxcRootPath?.path
      ? path.join(preferences.keepassxcRootPath.path, "Contents/MacOS/keepassxc-cli")
      : undefined;
  }

  /**
   * Check if the folder is valid for a search
   *
   * KeePassXC's search doesn't include all folders.
   * That function aims to replicate which folder are used.
   *
   * @param {string} entryStr - The folder to check.
   * @returns {boolean} - True if the folder is valid, false otherwise.
   */
  private static isValidFolder = (folder: string) => {
    return (
      folder !== undefined &&
      folder.length > 0 &&
      !["Deprecated", "Recycle Bin", "Trash", "回收站"].some((exclude) => folder.startsWith(exclude))
    );
  };

  /**
   * Error handler for the KeePassXC CLI's STDERR stream.
   *
   * If the error message contains the string "Enter password to unlock", or "Maximum depth of replacement has been reached",
   * or the error message is empty, the error is ignored. Otherwise, the error is rejected.
   *
   * @param {function} reject - The function to call with the error message.
   * @returns {function} - A function to handle errors on the stderr stream.
   */
  private static cliStderrErrorHandler = (reject: (reason: Error) => void) => {
    return (data: Buffer) => {
      if (
        data.toString().indexOf("Enter password to unlock") != -1 ||
        data.toString().indexOf("Maximum depth of replacement has been reached") != -1 ||
        data.toString().trim().length == 0
      ) {
        return;
      }
      reject(new Error(data.toString()));
    };
  };

  /**
   * Converts a key file path into an option array for the KeePassXC CLI.
   *
   * If the key file string is not empty and not null, this function returns an array
   * with the "-k" option and the key file path. Otherwise, it returns an empty array.
   *
   * @param {string} keyFile - The key file path.
   * @returns {string[]} - An array with the "-k" option and the key file path, or an empty array.
   */
  private static convertIntoKeyFileOption = (keyFile: string) => {
    return keyFile != "" && keyFile != null ? ["-k", `${keyFile}`] : [];
  };

  /**
   * Converts a string from the KeePassXC CLI into a sorted array of strings.
   *
   * The KeePassXC CLI returns a CSV string, which this function parses into an array
   * of strings. The array is sorted first by the title of the entry, and then by the
   * username of the entry.
   *
   * @param {string} entries - The string returned from the KeePassXC CLI.
   * @returns {string[][]} - A sorted array of strings, where each string contains the
   * information of an entry.
   */
  private static parseCsvEntries = (entries: string) => {
    let entriesArray = parse(entries, { delimiter: ",", from_line: 2 })
      .sort((a: string[], b: string[]) => {
        // sort first by the title
        const titleComparison = a[1].localeCompare(b[1]);
        if (titleComparison !== 0) return titleComparison;
        // sort second by the username
        return a[2] ? (b[2] ? a[2].localeCompare(b[2]) : -1) : 1;
      })
      .filter((entry: string[]) => {
        // check if there is a nested folder and its validity
        const parts = entry[0].split("/");
        if (parts.length < 2) return true;
        return parts.every((part) => this.isValidFolder(part));
      });
    entriesArray = entriesArray.map((entry: string[]) => {
      const parts = entry[0].split("/");
      entry[0] = parts.slice(1).join("/");
      return entry;
    });
    return entriesArray;
  };

  /**
   * Sets the password for the KeePass database.
   *
   * @param password The password to unlock the KeePass database.
   */
  private static setDatabasePassword = (password: string) => {
    this.databasePassword = password;
  };

  /**
   * Set the key file for the KeePass database.
   *
   * @param path The path to the key file.
   */
  private static setKeyFile = (path: string) => {
    this.keyFile = path;
  };

  /**
   * Cache the given credentials for later use.
   *
   * @param password The password to cache.
   * @param keyFile The path to the key file to cache.
   */
  static cacheCredentials = (password: string, keyFile = "") => {
    LocalStorage.setItem("databasePassword", password);
    LocalStorage.setItem("keyFile", keyFile);
  };

  /**
   * Checks the given credentials to see if they are valid.
   *
   * @param databasePassword The password to unlock the KeePass database.
   * @param keyFile The path to the key file to unlock the KeePass database.
   * @returns A Promise that resolves if the credentials are valid, and rejects otherwise.
   */
  static checkCredentials = (databasePassword: string, keyFile: string) => {
    return new Promise<void>((resolve, reject) => {
      const cli = this.spawn(`${this.keepassxcCli}`, [
        "db-info",
        ...this.convertIntoKeyFileOption(keyFile),
        "-q",
        `${this.database}`,
      ]);

      cli.stdin.write(`${databasePassword}\n`);
      cli.stdin.end();
      cli.on("error", reject);
      cli.stderr.on("data", this.cliStderrErrorHandler(reject));
      cli.on("exit", (code) => {
        code === 0 ? resolve() : reject(new Error("Invalid Credentials"));
      });
    });
  };

  /**
   * Removes the stored credentials from LocalStorage.
   *
   * This function deletes the cached database password and key file path
   * from LocalStorage, ensuring that the credentials are no longer stored
   * locally.
   */
  static deleteCredentialsCache = () => {
    LocalStorage.removeItem("databasePassword");
    LocalStorage.removeItem("keyFile");
  };

  /**
   * Execute the keepassxc-cli command with the given options and
   * returns the result as a string.
   *
   * The function will reject the promise if an
   * error occurs during the execution of the command.
   *
   * @param {string[]} options - The options to pass to the keepassxc-cli command.
   * @returns {Promise<string>} The result of the command.
   */
  static execKeepassXCCli = (options: string[]) => {
    return new Promise<string>((resolve, reject) => {
      const chuncks: Buffer[] = [];
      const cli = this.spawn(`${this.keepassxcCli}`, options);
      const tryResolve = () => {
        if (ended && exited) {
          resolve(result);
        }
      };
      let ended = false;
      let exited = false;
      let result: string;

      cli.stdin.write(`${this.databasePassword}\n`);
      cli.stdin.end();
      cli.on("error", reject);
      cli.stderr.on("data", this.cliStderrErrorHandler(reject));
      cli.stdout.on("data", (chunck) => {
        chuncks.push(chunck);
      });
      cli.stdout.on("end", () => {
        result = chuncks.join("").toString();
        result = result.slice(0, result.length - 1);
        ended = true;
        tryResolve();
      });
      cli.on("exit", (code) => {
        if (code === 0) {
          exited = true;
          tryResolve();
        } else {
          reject(new Error(`Process exited with code: ${code}`));
        }
      });
    });
  };

  /**
   * Load credentials from LocalStorage.
   *
   * If the credentials aren't stored in LocalStorage, it will return an empty object.
   * Otherwise, it will return the loaded credentials.
   *
   * @returns {Promise<{ databasePassword: string; keyFile: string }>} The loaded credentials.
   */
  static loadCredentialsCache = async () => {
    const credentials: { databasePassword: string; keyFile: string } = {
      databasePassword: "",
      keyFile: "",
    };
    await LocalStorage.getItem("databasePassword").then((password) => {
      credentials.databasePassword = password as string;
    });
    await LocalStorage.getItem("keyFile").then((keyFile) => {
      credentials.keyFile = keyFile as string;
    });
    return credentials;
  };

  /**
   * Load entries from LocalStorage.
   *
   * If the entries aren't stored in LocalStorage, it will return an empty array.
   * Otherwise, it will return the parsed entries.
   *
   * @returns {Promise<string[][]>} The entries in a CSV format.
   */
  static loadEntriesCache = () => {
    return LocalStorage.getItem("entries").then((entries) => {
      if (entries == undefined) {
        return [];
      } else {
        return this.parseCsvEntries(entries as string);
      }
    });
  };

  /**
   * Refreshes the cache of the KeePass database entries.
   *
   * Calls the KeePassXC CLI to export the database entries in CSV format.
   * The exported entries are then cached and parsed into a sorted array
   * of strings.
   *
   * @returns {Promise<string[][]>} - A promise that resolves to the parsed
   * entries.
   */
  static refreshEntriesCache = () => {
    return this.execKeepassXCCli([
      "export",
      ...this.convertIntoKeyFileOption(this.keyFile),
      "-q",
      "-f",
      "csv",
      `${this.database}`,
    ]).then((entries) => {
      LocalStorage.setItem("entries", entries);
      return this.parseCsvEntries(entries);
    });
  };

  /**
   * Sets the database password and key file path.
   *
   * @param {string} password - The password for the KeePass database.
   * @param {string} [keyFile=""] - The optional path to the key file.
   */
  static setCredentials = (password: string, keyFile = "") => {
    this.setDatabasePassword(password);
    this.setKeyFile(keyFile);
  };
}

export { KeePassLoader, showToastCliErrors };
