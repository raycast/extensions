import { Clipboard, getPreferenceValues, showHUD, LocalStorage } from "@raycast/api";
import path from "path";
import child_process from "child_process";
const spawn = child_process.spawn;

interface Preference {
  keepassxcRootPath: {
    name: string;
    path: string;
    bundleId: string;
  };
  database: string;
  dbPassword: string;
  keyFile: string;
}

const getKeepassXCVersion = () =>
  new Promise<number>((resolve, reject) => {
    const cli = spawn(`${keepassxcCli}`, ["--version"]);
    cli.stderr.on("data", cliStdOnErr(reject));
    const chuncks: Buffer[] = [];
    cli.stdout.on("data", (chunck) => {
      chuncks.push(chunck);
    });
    cli.stdout.on("end", () => {
      const version = parseFloat(chuncks.join("").toString().split(".").slice(0, 2).join("."));
      console.log("current keepassxc version:", version);
      // remove \n in the end
      resolve(version);
    });
  });

const preferences: Preference = getPreferenceValues();
// keepass database file path
const database = preferences.database;
// password for keepass database
const dbPassword = preferences.dbPassword;
// Key File for keepass database
const keyFile = preferences.keyFile;
// keepass-cli executable path
const keepassxcCli = path.join(preferences.keepassxcRootPath.path, "Contents/MacOS/keepassxc-cli");
// search entry command, since version 2.7 command 'locate' has been renamed to 'search'
const getSearchEntryCommand = async () => ((await getKeepassXCVersion()) >= 2.7 ? "search" : "locate");
const keyFileOption = keyFile != "" && keyFile != null ? ["-k", `${keyFile}`] : [];
// cli options
const cliOptions = [...keyFileOption, "-q"];
const entryFilter = (entryStr: string) => {
  return entryStr
    .split("\n")
    .map((f: string) => f.trim())
    .filter(
      (f: string) =>
        f !== undefined &&
        !f.startsWith("/回收站") &&
        !f.startsWith("/Trash") &&
        !f.startsWith("/Deprecated") &&
        f.length > 0
    )
    .sort();
};

/**
 * execute command with keepassxc-cli
 * @param command The command to run.
 * @param options List of string arguments.
 * @returns
 */
const execKeepassXCCli = async (options: string[]) =>
  new Promise<string>((resolve, reject) => {
    const cli = spawn(`${keepassxcCli}`, options);
    cli.stdin.write(`${dbPassword}\n`);
    cli.stdin.end();
    cli.on("error", reject);
    cli.stderr.on("data", cliStdOnErr(reject));
    const chuncks: Buffer[] = [];
    cli.stdout.on("data", (chunck) => {
      chuncks.push(chunck);
    });
    // finish when all chunck has been collected
    cli.stdout.on("end", () => {
      const result = chuncks.join("").toString();
      // remove \n in the end
      resolve(result.slice(0, result.length - 1));
    });
  });

/**
 * load entries from cache
 * @returns all entries in LocalStorage
 */
const loadEntriesCache = async () => {
  return LocalStorage.getItem("entries").then((entries) => {
    if (entries == undefined) {
      return [];
    } else {
      return entryFilter(entries.toString());
    }
  });
};

/**
 * refresh entries cache
 * @returns all entries in database file
 */
const refreshEntriesCache = async () =>
  getSearchEntryCommand()
    .then((cmd) => {
      const search_keywrod = cmd === "search" ? "" : "/";
      return execKeepassXCCli([cmd, ...keyFileOption, "-q", `${database}`, search_keywrod]);
    })
    .then((entries) => {
      LocalStorage.setItem("entries", entries);
      return entryFilter(entries);
    });

const cliStdOnErr = (reject: (reason: Error) => void) => (data: Buffer) => {
  if (
    data.toString().indexOf("Enter password to unlock") != -1 ||
    data.toString().indexOf("Maximum depth of replacement has been reached") != -1 ||
    data.toString().trim().length == 0
  ) {
    return;
  }
  reject(new Error(data.toString()));
};

const getPassword = (entry: string) =>
  execKeepassXCCli(["show", ...cliOptions, "-a", "Password", `${database}`, `${entry}`]);

const getUsername = (entry: string) =>
  execKeepassXCCli(["show", ...cliOptions, "-a", "Username", `${database}`, `${entry}`]);

const pastePassword = async (entry: string) => {
  console.log("paste password of entry:", entry);
  return getPassword(entry).then((password) => {
    return Clipboard.paste(password).then(() => password);
  });
};

const copyPassword = async (entry: string) =>
  getPassword(entry).then((password) => {
    showHUD("Password has been Copied to Clipboard");
    return Clipboard.copy(password, { concealed: true }).then(() => password);
  });

const pasteUsername = async (entry: string) => {
  console.log("paste username of entry:", entry);
  return getUsername(entry).then((username) => {
    return Clipboard.paste(username).then(() => username);
  });
};

const copyUsername = async (entry: string) =>
  getUsername(entry).then((username) => {
    showHUD("Username has been Copied to Clipboard");
    return Clipboard.copy(username).then(() => username);
  });

const pasteTOTP = async (entry: string) => {
  console.log("paste totp of entry:", entry);
  return getTOTP(entry).then((otp) => {
    return Clipboard.paste(otp).then(() => otp);
  });
};

const copyTOTP = async (entry: string) =>
  getTOTP(entry).then((otp) => {
    showHUD("TOTP has been Copied to Clipboard");
    return Clipboard.copy(otp, { concealed: true }).then(() => otp);
  });

const getTOTP = (entry: string) => execKeepassXCCli(["show", ...cliOptions, "-t", `${database}`, `${entry}`]);

const getURL = (entry: string) => execKeepassXCCli(["show", ...cliOptions, "-a", "URL", `${database}`, `${entry}`]);

export {
  loadEntriesCache,
  refreshEntriesCache,
  pastePassword,
  pasteUsername,
  pasteTOTP,
  getPassword,
  getURL,
  copyPassword,
  copyUsername,
  copyTOTP,
};
