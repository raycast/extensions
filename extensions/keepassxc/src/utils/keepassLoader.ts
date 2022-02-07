import { copyTextToClipboard, pasteText, getPreferenceValues } from "@raycast/api";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import child_process from "child_process";
import CryptoJS from "crypto-js";
const stat = promisify(fs.stat);
const exec = promisify(child_process.exec);

interface Preference {
  keepassxcRootPath: string;
  database: string;
  dbPassword: string;
}

const preferences: Preference = getPreferenceValues();

// this file is used to cache entries (without password) in the database
const cacheFile = path.join("/tmp/", CryptoJS.enc.Utf8.parse(preferences.database).toString().slice(0, 8) + ".cache");
// keepass database file path
const database = preferences.database;
// password for keepass database
const dbPassword = preferences.dbPassword;
// keepass-cli executable path
const keepassxcCli = path.join(preferences.keepassxcRootPath, "Contents/MacOS/keepassxc-cli");
const key = CryptoJS.enc.Utf8.parse(preferences.dbPassword);
const iv = CryptoJS.enc.Utf8.parse(preferences.database);
const decrypt = (word: string) => {
  const encryptedHexStr = CryptoJS.enc.Hex.parse(word);
  const srcs = CryptoJS.enc.Base64.stringify(encryptedHexStr);
  const decrypt = CryptoJS.AES.decrypt(srcs, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  const decryptedStr = decrypt.toString(CryptoJS.enc.Utf8);
  return decryptedStr.toString();
};

const encrypt = (word: string) => {
  const srcs = CryptoJS.enc.Utf8.parse(word);
  const encrypted = CryptoJS.AES.encrypt(srcs, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  return encrypted.ciphertext.toString().toUpperCase();
};

/**
 * load entries from database with keepassxc-cli
 * @returns all entries in keepass database
 */
const loadEntries = async () => {
  // a cache file is used to boost response speed of loading entries by avoid calling keepassxc-cli every time (which may take 2 ~ 3 seconds)
  if (!fs.existsSync(cacheFile)) {
    const { stdout, stderr } = await exec(`echo "${dbPassword}" | "${keepassxcCli}" locate "${database}" /`);
    if (stderr.includes("Error")) {
      throw new Error(stderr.toString());
    }
    fs.writeFileSync(cacheFile, encrypt(stdout.toString()));
  }
  const lastModifiedTime = (await stat(cacheFile)).mtime.getTime();
  const currTime = new Date().getTime();
  let data = "";
  if (currTime - lastModifiedTime <= 1000 * 60 && fs.existsSync(cacheFile)) {
    // load entries from cache
    data = decrypt(fs.readFileSync(cacheFile, "utf8"));
  } else {
    // call keepassxc-cli to refresh cache file if it is more than 1 minute since last modified
    const { stdout, stderr } = await exec(`echo "${dbPassword}" | "${keepassxcCli}" locate "${database}" /`);
    if (stderr.includes("Error")) {
      throw new Error(stderr.toString());
    }
    fs.writeFileSync(cacheFile, encrypt(stdout.toString()));
    data = stdout.toString();
  }
  return data
    .split("\n")
    .map((f: string) => f.trim())
    .filter((f: string) => f !== undefined && !f.startsWith("/回收站") && !f.startsWith("/Trash") && f.length > 0);
};

const getPassword = async (entry: string) => {
  const { stdout } = await exec(
    `echo "${dbPassword}"  | "${keepassxcCli}"  show -q  -a Password "${database}" "${entry}"`
  );
  return stdout.toString().trim();
};

const getUsername = async (entry: string) => {
  const { stdout } = await exec(
    `echo "${dbPassword}"  | "${keepassxcCli}"  show -q  -a Username "${database}" "${entry}"`
  );
  return stdout.toString().trim();
};

const copyAndPastePassword = async (entry: string) => {
  return copyPassword(entry).then((password) => {
    return pasteText(password).then(() => password);
  });
};

const copyPassword = async (entry: string) =>
  getPassword(entry).then((password) => copyTextToClipboard(password).then(() => password));

const copyAndPasteUsername = async (entry: string) => {
  return copyUsername(entry).then((username) => {
    return pasteText(username).then(() => username);
  });
};

const copyUsername = async (entry: string) =>
  getUsername(entry).then((username) => copyTextToClipboard(username).then(() => username));

export { loadEntries, copyAndPastePassword, getPassword, copyPassword, copyUsername, copyAndPasteUsername };
