import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { environment, getPreferenceValues } from "@raycast/api";

const iCloudDrive = path.join(os.homedir(), "Library", "Mobile Documents", "com~apple~CloudDocs");
const syncFolder = path.join(iCloudDrive, "Raycast Hacker News");
// Every story in an older file has already left the feed
const staleAfterMs = 8 * 24 * 60 * 60 * 1000;

// Each Mac writes only its own file, so iCloud never has two writers to reconcile
function deviceFile() {
  const idFile = path.join(environment.supportPath, "device-id");
  if (!fs.existsSync(idFile)) {
    fs.mkdirSync(environment.supportPath, { recursive: true });
    fs.writeFileSync(idFile, randomUUID());
  }
  return path.join(syncFolder, `read-${fs.readFileSync(idFile, "utf8").trim()}.json`);
}

function isSyncing() {
  return getPreferenceValues<Preferences>().syncWithICloud && fs.existsSync(iCloudDrive);
}

function syncFiles() {
  return fs
    .readdirSync(syncFolder)
    .filter((name) => name.startsWith("read-") && name.endsWith(".json"))
    .map((name) => path.join(syncFolder, name));
}

function readFile(file: string) {
  try {
    const urls: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(urls) ? urls.filter((url): url is string => typeof url === "string") : [];
  } catch {
    return [];
  }
}

export function readSyncedStories() {
  if (!isSyncing()) return [];
  try {
    return syncFiles().flatMap(readFile);
  } catch {
    return [];
  }
}

export function writeSyncedStories(urls: string[]) {
  if (!isSyncing()) return;
  try {
    const file = deviceFile();
    const data = JSON.stringify(urls);
    // The menu bar saves every 10 minutes, and iCloud uploads even an unchanged file
    if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === data) return;
    fs.mkdirSync(syncFolder, { recursive: true });
    fs.writeFileSync(file, data);
  } catch (error) {
    console.error("Failed to sync read stories to iCloud Drive:", error);
  }
}

// A Mac that stops running the extension would otherwise leave its file behind
export function removeStaleSyncFiles() {
  if (!isSyncing()) return;
  try {
    const now = Date.now();
    syncFiles()
      .filter((file) => now - fs.statSync(file).mtimeMs > staleAfterMs)
      .forEach((file) => fs.rmSync(file));
  } catch {
    // The folder doesn't exist until something is first marked read
  }
}
