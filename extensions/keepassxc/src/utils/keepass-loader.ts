import { getApplications, getPreferenceValues, LocalStorage, Toast, showToast } from "@raycast/api";
import { parse } from "csv-parse/sync";
import child_process from "child_process";
import process from "process";

/**
 * Utility function to show a toast message for CLI errors
 *
 * Takes the error message from the CLI and shows a toast message with a
 * human-readable description. If the error is due to an invalid preference,
 * the toast message will be "Invalid Preference: <preference name>"
 *
 * @param {Object} error - Error object with a `message` property
 */
const showToastKeepassxcCliErrors = (error: { message: string }): void => {
  let invalidPreference = "";
  let toastMessage = error.message.trim();
  if (error.message.includes("Invalid credentials") || error.message.includes("Failed to load key file")) {
    toastMessage = "Invalid Credentials";
  } else if (error.message.includes("keepassxc-cli: No such file or directory") || error.message.includes("ENOENT")) {
    toastMessage = "KeePassXC not found";
  } else if (
    error.message.includes("Failed to open database file") ||
    error.message.includes("Error while reading the database: Not a KeePass database")
  ) {
    invalidPreference = "KeePass Database";
  }
  if (invalidPreference !== "") {
    toastMessage = `Invalid Preference: ${invalidPreference}`;
  }
  showToast(Toast.Style.Failure, "Error", toastMessage);
};

/**
 * Input for creating a new entry in the KeePass database
 *
 * The database path, key file, and master password are intentionally not part
 * of this interface: they are private loader configuration established when the
 * database is unlocked, and are snapshotted for the duration of the invocation
 */
export interface CreateEntryInput {
  /** Relative group path such as `Internet` or `Internet/Banking`, or an empty string for the root group */
  groupPath: string;
  /** Title of the new entry. Must be nonblank and must not contain `/`, CR or LF */
  title: string;
  /** Optional username for the new entry */
  username?: string;
  /** Optional URL for the new entry */
  url?: string;
  /** Password for the new entry. Required, nonblank, must not contain CR or LF */
  password: string;
}

/**
 * Result of a confirmed entry creation
 *
 * `saved` is always `true` here: a failed or unconfirmed write rejects instead
 * of resolving with a failure result. `cacheInvalidated` is `false` when the
 * stale entry cache could not be removed after a successful save
 */
export interface CreateEntryResult {
  saved: true;
  cacheInvalidated: boolean;
}

class KeePassLoader {
  private static database: string = getPreferenceValues().database;
  private static databasePassword: string;
  private static keepassxcCli: string | undefined;
  private static keyFile: string;
  private static spawn = child_process.spawn;

  /**
   * Check if the folder is valid for a search
   *
   * KeePassXC's search doesn't include all folders. That function
   * aims to replicate which folder are used
   *
   * @param {string} folder - The folder to check
   * @returns {boolean} - `true` if the folder is valid, `false` otherwise
   */
  private static isValidFolder = (folder: string): boolean =>
    folder !== undefined &&
    folder.length > 0 &&
    !["Deprecated", "Recycle Bin", "Trash", "回收站"].some((exclude) => folder.startsWith(exclude));

  /**
   * Error handler for the KeePassXC CLI's STDERR stream
   *
   * If the error message contains the string "Enter password to unlock", or "Maximum depth
   * of replacement has been reached", or the error message is empty, the error is ignored.
   * Otherwise, the error is rejected
   *
   * @param {function} reject - The function to call with the error message
   * @returns {function} - A function to handle errors on the stderr stream
   */
  private static cliStderrErrorHandler = (reject: (reason: Error) => void) => (data: Buffer) => {
    if (
      data.toString().indexOf("Enter password to unlock") != -1 ||
      data.toString().indexOf("Maximum depth of replacement has been reached") != -1 ||
      data.toString().trim().length == 0
    ) {
      return;
    }
    reject(new Error(data.toString()));
  };

  /**
   * Converts a key file path into an option array for the KeePassXC CLI
   *
   * If the key file string is not empty and not null, this function returns an array
   * with the `-k` option and the key file path. Otherwise, it returns an empty array
   *
   * @param {string} keyFile - The key file path
   * @returns {string[]} - An array with the `-k` option and the key file path, or an empty array
   */
  private static convertIntoKeyFileOption = (keyFile: string) =>
    keyFile != "" && keyFile != null ? ["-k", `${keyFile}`] : [];

  /**
   * Converts a string from the KeePassXC CLI into a sorted array of strings
   *
   * The KeePassXC CLI returns a CSV string, which this function parses into an array
   * of strings. The array is sorted first by the title of the entry, and then by the
   * username of the entry
   *
   * @param {string} entries - The string returned from the KeePassXC CLI
   * @returns {string[][]} - A sorted array of strings, where each string contains the
   * information of an entry
   */
  private static parseCsvEntries = (entries: string): string[][] => {
    let entriesArray = parse(entries, {
      delimiter: ",",
      from_line: 2,
      relax_column_count: true,
      relax_quotes: true,
      skip_empty_lines: true,
      trim: true,
    })
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
   * Sets the password for the KeePass database
   *
   * @param password - The password to unlock the KeePass database
   */
  private static setDatabasePassword = (password: string) => {
    this.databasePassword = password;
  };

  /**
   * Set the key file for the KeePass database
   *
   * @param path - The path to the key file
   */
  private static setKeyFile = (path: string) => {
    this.keyFile = path;
  };

  /**
   * Find the installed KeePassXC application
   *
   * This function uses the `getApplications` function from the `@raycast/api` library
   * to get a list of all installed applications on the system. It then filters the list
   * to only include applications with the name "KeePassXC". If the list is not empty,
   * it sets the `keepassxcCli` class variable to the path of the found application.
   * If the list is empty, it does nothing
   *
   * @returns {Promise<void>} - A promise that resolves nothing
   */
  static findApplication = async (): Promise<void> => {
    if (process.platform === "win32") {
      this.keepassxcCli = "C:\\Program Files\\KeePassXC\\keepassxc-cli.exe";
    } else {
      const installedApplications = await getApplications();
      const apps = installedApplications.filter((application) => application.name == "KeePassXC");
      if (apps.length > 0) {
        this.keepassxcCli = apps[0].path + "/Contents/MacOS/keepassxc-cli";
      }
    }
  };

  /**
   * Cache the given credentials for later use
   *
   * @param {string} password - The password to cache
   * @param {string} keyFile - The path to the key file to cache
   */
  static cacheCredentials = (password: string = "", keyFile: string = "") => {
    LocalStorage.setItem("databasePassword", password);
    LocalStorage.setItem("keyFile", keyFile);
  };

  /**
   * Checks the given credentials to see if they are valid
   *
   * @param {string} databasePassword - The password to unlock the KeePass database
   * @param {string} keyFile - The path to the key file to unlock the KeePass database
   * @returns {Promise} - Promise that resolves if the credentials are valid, and rejects otherwise
   */
  static checkCredentials = (databasePassword: string = "", keyFile: string = "") =>
    KeePassLoader.findApplication().then(() => {
      return new Promise<void>((resolve, reject) => {
        const cli = this.spawn(`${this.keepassxcCli}`, [
          "db-info",
          ...this.convertIntoKeyFileOption(keyFile),
          ...(databasePassword === "" ? ["--no-password"] : []),
          "-q",
          `${this.database}`,
        ]);

        if (databasePassword !== "") {
          cli.stdin.write(`${databasePassword}\n`);
        }
        cli.stdin.end();
        cli.on("error", reject);
        cli.stderr.on("data", this.cliStderrErrorHandler(reject));
        cli.on("exit", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error("Invalid Credentials"));
          }
        });
      });
    });

  /**
   * Removes the stored credentials from `LocalStorage`
   *
   * This function deletes the cached database password and key file path
   * from LocalStorage, ensuring that the credentials are no longer stored
   * locally
   */
  static deleteCredentialsCache = () => {
    LocalStorage.removeItem("databasePassword");
    LocalStorage.removeItem("keyFile");
  };

  /**
   * Execute the `keepassxc-cli` command with the given options and
   * returns the result as a string
   *
   * The function will reject the promise if an error occurs during the execution
   * of the command
   *
   * @param {string[]} options - The options to pass to the `keepassxc-cli` command
   * @returns {Promise<string>} - The result of the command
   */
  static execKeepassxcCli = (options: string[]): Promise<string> =>
    KeePassLoader.findApplication().then(() => {
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

        if (this.databasePassword !== "") {
          cli.stdin.write(`${this.databasePassword}\n`);
        }
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
            reject(new Error(`Something went wrong when accessing the database (exit code: ${code})`));
          }
        });
      });
    });

  /**
   * Load credentials from `LocalStorage`
   *
   * If the credentials aren't stored in LocalStorage, it will return an empty object.
   * Otherwise, it will return the loaded credentials
   *
   * @returns {Promise<{ databasePassword: string; keyFile: string }>} - The loaded credentials
   */
  static loadCredentialsCache = async (): Promise<{ databasePassword: string; keyFile: string }> => {
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
   * Load entries from `LocalStorage`
   *
   * If the entries aren't stored in `LocalStorage`, it will return an empty array
   * Otherwise, it will return the parsed entries
   *
   * @returns {Promise<string[][]>} - The entries in a CSV format
   */
  static loadEntriesCache = (): Promise<string[][]> =>
    LocalStorage.getItem("entries").then((entries) => {
      if (entries == undefined) {
        return [];
      } else {
        return this.parseCsvEntries(entries as string);
      }
    });

  /**
   * Refreshes the cache of the KeePass database entries
   *
   * Calls the KeePassXC CLI to export the database entries in CSV format.
   * The exported entries are then cached and parsed into a sorted array
   * of strings
   *
   * @returns {Promise<string[][]>} - A promise that resolves to the parsed entries
   */
  static refreshEntriesCache = (): Promise<string[][]> =>
    this.execKeepassxcCli([
      "export",
      ...this.convertIntoKeyFileOption(this.keyFile),
      ...(this.databasePassword === "" ? ["--no-password"] : []),
      "-q",
      "-f",
      "csv",
      `${this.database}`,
    ]).then((entries) => {
      LocalStorage.setItem("entries", entries);
      return this.parseCsvEntries(entries);
    });

  /**
   * Validates a group path for entry creation
   *
   * An empty string is the root group. Otherwise the path must be a relative
   * nonempty segment path: no leading or trailing slash, no double slash, no
   * CR/LF, and no blank segments. The UI is expected to select an existing
   * visible group, so representability follows from that selection
   *
   * @param {string} groupPath - The group path from `CreateEntryInput`
   * @returns {boolean} - `true` if the group path is valid, `false` otherwise
   */
  private static isValidGroupPath = (groupPath: string): boolean => {
    if (groupPath.length === 0) return true; // root group
    if (groupPath.startsWith("/") || groupPath.endsWith("/") || groupPath.includes("\n") || groupPath.includes("\r")) {
      return false;
    }
    return groupPath.split("/").every((segment) => segment.length > 0);
  };

  /**
   * Validates the fields of a `CreateEntryInput` before anything is spawned
   *
   * Secrets are never trimmed or normalized. The master password must be an
   * initialized string (it may be explicitly empty, which is the keyfile-only
   * configuration), and a nonempty master must not contain CR or LF. The new
   * entry password is required and must not contain CR or LF, because the CLI
   * reads it line by line
   *
   * @param {CreateEntryInput} input - The entry to validate
   * @param {string | undefined} masterPassword - The snapshotted master password
   * @returns {void} - Rejects with a sanitized message when validation fails
   */
  private static validateCreateEntryInput = (input: CreateEntryInput, masterPassword: string | undefined): void => {
    if (
      input.title.trim().length === 0 || // blank check only; the value itself is never trimmed
      input.title.includes("/") ||
      input.title.includes("\n") ||
      input.title.includes("\r")
    ) {
      throw new Error("The entry title must be nonblank and must not contain slashes or line breaks.");
    }
    if (!this.isValidGroupPath(input.groupPath)) {
      throw new Error("The selected group is not a valid target for a new entry.");
    }
    if (input.password.length === 0 || input.password.includes("\n") || input.password.includes("\r")) {
      throw new Error("The entry password is required and must not contain line breaks.");
    }
    if (typeof masterPassword !== "string") {
      throw new Error("The database must be unlocked before creating an entry.");
    }
    if (masterPassword.length > 0 && (masterPassword.includes("\n") || masterPassword.includes("\r"))) {
      throw new Error("The database password must not contain line breaks.");
    }
  };

  /**
   * Creates a new entry in the KeePass database
   *
   * This is a dedicated write spawn path, separate from the read execution in
   * `execKeepassxcCli`: the read path rejects early on stderr, which is unsafe
   * for writes because the process may still succeed. The write path instead
   * settles only when the process has fully closed and its final exit code is
   * observed
   *
   * The database path, key file, and master password are snapshotted before
   * the first asynchronous yield, so the invocation is unaffected by later
   * `setCredentials` calls. The CLI path is resolved after `findApplication`
   * (it cannot be snapshotted earlier because that lookup is asynchronous).
   * The real CLI may re-authenticate internally.
   * No secrets are placed on argv: the master password (unless explicitly
   * empty, i.e. keyfile-only) and then the new entry password are written to
   * stdin, each followed by a newline, and stdin is closed. There are no
   * retries. This method never returns, logs, or adds separate persistence
   * for the entry password; note that the pre-existing Search CSV cache (which
   * contains passwords and lives in encrypted LocalStorage) is unchanged by
   * this method apart from the post-save invalidation above
   *
   * On a confirmed save (exit code 0), the stale `entries` cache is removed so
   * the next Search refreshes it through its normal mount behavior. If cache
   * invalidation itself fails, the result still reports a successful save with
   * `cacheInvalidated: false`
   *
   * @param {CreateEntryInput} input - The entry to create
   * @returns {Promise<CreateEntryResult>} - Resolves on a confirmed save, rejects with a sanitized error otherwise
   */
  static createEntry = (input: CreateEntryInput): Promise<CreateEntryResult> => {
    // Snapshot private configuration before any asynchronous yield
    const database = this.database;
    const keyFile = this.keyFile;
    const masterPassword = this.databasePassword;
    try {
      this.validateCreateEntryInput(input, masterPassword);
    } catch (validationError) {
      return Promise.reject(validationError);
    }
    return KeePassLoader.findApplication().then(() => {
      const cliPath = this.keepassxcCli;
      if (cliPath === undefined) {
        return Promise.reject(new Error("KeePassXC not found."));
      }
      const entryPath = `/${[input.groupPath, input.title].filter((part) => part.length > 0).join("/")}`;
      const args: string[] = [
        "add",
        "-q",
        "-p",
        ...(input.username !== undefined && input.username.length > 0 ? ["--username", input.username] : []),
        ...(input.url !== undefined && input.url.length > 0 ? ["--url", input.url] : []),
        ...this.convertIntoKeyFileOption(keyFile),
        ...(masterPassword === "" ? ["--no-password"] : []),
        database,
        entryPath,
      ];
      return new Promise<CreateEntryResult>((resolve, reject) => {
        const uncertain = () =>
          reject(new Error("Creation could not be confirmed. Check the database before trying again."));
        const cli = this.spawn(`${cliPath}`, args);
        let stderrData = "";
        cli.stdin.on("error", () => {
          // EPIPE and friends: the process may still have succeeded; the
          // final exit code decides. Never propagate as an unhandled error
        });
        try {
          // A synchronous write throw (e.g. an already-destroyed stdin) must
          // not obscure the close outcome, so it is swallowed here
          if (masterPassword !== "") {
            cli.stdin.write(`${masterPassword}\n`);
          }
          cli.stdin.write(`${input.password}\n`);
          cli.stdin.end();
        } catch {
          // stdin unavailable; the final exit code still decides the outcome
        }
        // Drain both streams so a large or chatty process cannot stall; the
        // contents are diagnostics only and are never surfaced with secrets
        cli.stdout.on("data", () => {});
        cli.stderr.on("data", (chunk: Buffer) => {
          stderrData += chunk.toString();
        });
        cli.on("error", () => {
          // Only treat this as a failed spawn when no process was ever
          // created (no pid). A ChildProcess "error" with a live pid can also
          // mean kill/IPC/abort while the process actually ran, so in that
          // case the event is only recorded and the final close still decides
          if (cli.pid === undefined) {
            reject(new Error("Failed to run the KeePassXC command line tool."));
          }
        });
        cli.on("close", (code) => {
          // Settles on the final observed exit code only, regardless of any
          // earlier stdin or process error events
          if (code === 0) {
            LocalStorage.removeItem("entries")
              .then(() => resolve({ saved: true, cacheInvalidated: true }))
              .catch(() => resolve({ saved: true, cacheInvalidated: false }));
            return;
          }
          if (code === null) {
            // No exit code was reported (killed or lost), so the write
            // outcome is unknown
            uncertain();
            return;
          }
          // A nonzero exit means the database rejected the write. Diagnostics
          // (duplicate titles, missing groups, credential prompts) are
          // intentionally NOT distinguished here: under `-q` they can look
          // identical, so only a generic sanitized message is used
          reject(
            new Error(
              "Could not create the entry. Verify the title and selected group, and make sure the database is unlocked.",
            ),
          );
          void stderrData; // collected for debugging only; never logged
        });
      });
    });
  };

  /**
   * Sets the database password and key file path
   *
   * @param {string} password - The password for the KeePass database
   * @param {string} [keyFile=""] - The optional path to the key file
   */
  static setCredentials = (password: string = "", keyFile: string = "") => {
    this.setDatabasePassword(password);
    this.setKeyFile(keyFile);
  };
}

export { KeePassLoader, showToastKeepassxcCliErrors };
