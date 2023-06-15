import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import path from "path";
import child_process from "child_process";
import { runAppleScript } from "run-applescript";
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
const cliOptions = [...keyFileOption, "-q", "-a"];
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
 * load entries from database with keepassxc-cli
 * @returns all entries in keepass database
 */
const loadEntries = () =>
  getSearchEntryCommand().then(
    (cmd) =>
      new Promise<string[]>((resolve, reject) => {
        const search_keywrod = cmd === "search" ? "" : "/";
        const cli = spawn(`${keepassxcCli}`, [cmd, ...keyFileOption, "-q", `${database}`, search_keywrod]);
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
  new Promise<string>((resolve, reject) => {
    const cli = spawn(`${keepassxcCli}`, ["show", ...cliOptions, "Password", `${database}`, `${entry}`]);
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
    const cli = spawn(`${keepassxcCli}`, ["show", ...cliOptions, "Username", `${database}`, `${entry}`]);
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

const pastePassword = async (entry: string) => {
  console.log("paste password of entry:", entry);
  return getPassword(entry).then((password) => {
    return Clipboard.paste(password).then(() => password);
  });
};

const copyPassword = async (entry: string) =>
  getPassword(entry).then((password) => {
    showHUD("Password has been Copied to Clipboard");
    return protectedCopy(password).then(() => password);
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

const copyTOTP = async (entry: string) =>
  getTOTP(entry).then((otp) => {
    showHUD("TOTP has been Copied to Clipboard");
    return protectedCopy(otp).then(() => otp);
  });

const getTOTP = (entry: string) =>
  new Promise<string>((resolve, reject) => {
    const cli = spawn(`${keepassxcCli}`, [
      "show",
      ...cliOptions.filter((x) => x != "-a"),
      "-t",
      `${database}`,
      `${entry}`,
    ]);
    cli.stdin.write(`${dbPassword}\n`);
    cli.stdin.end();
    cli.on("error", reject);
    cli.stderr.on("data", cliStdOnErr(reject));
    const chuncks: Buffer[] = [];
    cli.stdout.on("data", (chunck) => {
      chuncks.push(chunck);
    });
    cli.stdout.on("end", () => {
      const otp = chuncks.join("").toString();
      // remove \n in the end
      resolve(otp.slice(0, otp.length - 1));
    });
  });

async function protectedCopy(concealString: string) {
  // await closeMainWindow();
  const script = `
      use framework "Foundation"
      set type to current application's NSPasteboardTypeString
      set pb to current application's NSPasteboard's generalPasteboard()
      pb's clearContents()
      pb's setString:"" forType:"org.nspasteboard.ConcealedType"
      pb's setString:"${concealString}" forType:type
    `;
  try {
    await runAppleScript(script);
  } catch {
    // Applescript failed to conceal what is being placed in the pasteboard
    await showHUD("Protect copy failed...");
  }
}

export { loadEntries, pastePassword, getPassword, copyPassword, copyUsername, pasteUsername, copyTOTP };
