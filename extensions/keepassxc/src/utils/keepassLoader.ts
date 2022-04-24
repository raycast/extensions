import { copyTextToClipboard, pasteText, getPreferenceValues, showHUD } from "@raycast/api";
import path from "path";
import child_process from "child_process";
const spawn = child_process.spawn;

interface Preference {
  keepassxcRootPath: string;
  database: string;
  dbPassword: string;
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
// keepass-cli executable path
const keepassxcCli = path.join(preferences.keepassxcRootPath, "Contents/MacOS/keepassxc-cli");
// search entry command, since version 2.7 command 'locate' has been renamed to 'search'
const getSearchEntryCommand = async () => ((await getKeepassXCVersion()) >= 2.7 ? "search" : "locate");

const entryFilter = (entryStr: string) => {
  return entryStr
    .split("\n")
    .map((f: string) => f.trim())
    .filter((f: string) => f !== undefined && !f.startsWith("/回收站") && !f.startsWith("/Trash") && f.length > 0)
    .sort();
};
/**
 * load entries from database with keepassxc-cli
 * @returns all entries in keepass database
 */
const loadEntries = () =>
  getSearchEntryCommand().then(
    (cmd) =>
      new Promise<string[]>((resolve, reject) => {
        const search_keywrod = cmd === "search" ? "" : "/";
        const cli = spawn(`${keepassxcCli}`, [cmd, "-q", `${database}`, search_keywrod]);
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
          resolve(entryFilter(chuncks.join("").toString()));
        });
      })
  );

const cliStdOnErr = (reject: (reason: Error) => void) => (data: Buffer) => {
  if (data.toString().indexOf("Enter password to unlock") != -1 || data.toString().trim().length == 0) {
    return;
  }
  reject(new Error(data.toString()));
};

const getPassword = (entry: string) =>
  new Promise<string>((resolve, reject) => {
    const cli = spawn(`${keepassxcCli}`, ["show", "-q", "-a", "Password", `${database}`, `${entry}`]);
    cli.stdin.write(`${dbPassword}\n`);
    cli.stdin.end();
    cli.on("error", reject);
    cli.stderr.on("data", cliStdOnErr(reject));
    const chuncks: Buffer[] = [];
    cli.stdout.on("data", (chunck) => {
      chuncks.push(chunck);
    });
    cli.stdout.on("end", () => {
      const password = chuncks.join("").toString();
      // remove \n in the end
      resolve(password.slice(0, password.length - 1));
    });
  });

const getUsername = (entry: string) =>
  new Promise<string>((resolve, reject) => {
    const cli = spawn(`${keepassxcCli}`, ["show", "-q", "-a", "Username", `${database}`, `${entry}`]);
    cli.stdin.write(`${dbPassword}\n`);
    cli.stdin.end();
    cli.on("error", reject);
    cli.stderr.on("data", cliStdOnErr(reject));
    const chuncks: Buffer[] = [];
    cli.stdout.on("data", (chunck) => {
      chuncks.push(chunck);
    });
    cli.stdout.on("end", () => {
      const username = chuncks.join("").toString();
      // remove \n in the end
      resolve(username.slice(0, username.length - 1));
    });
  });

const copyAndPastePassword = async (entry: string) => {
  console.log("copy and password of entry:", entry);
  return copyPassword(entry).then((password) => {
    return pasteText(password).then(() => password);
  });
};

const copyPassword = async (entry: string) =>
  getPassword(entry).then((password) => {
    showHUD("Password has been Copied to Clipboard");
    return copyTextToClipboard(password).then(() => password);
  });

const copyAndPasteUsername = async (entry: string) => {
  return copyUsername(entry).then((username) => {
    return pasteText(username).then(() => username);
  });
};

const copyUsername = async (entry: string) =>
  getUsername(entry).then((username) => {
    showHUD("Username has been Copied to Clipboard");
    return copyTextToClipboard(username).then(() => username);
  });

export { loadEntries, copyAndPastePassword, getPassword, copyPassword, copyUsername, copyAndPasteUsername };
