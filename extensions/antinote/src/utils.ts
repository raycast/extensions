import { getApplications, showToast, Toast } from "@raycast/api";
import { execFileSync } from "child_process";
import { homedir } from "os";
import { resolve } from "path";

export const DB_PATH = resolve(homedir(), "Library/Containers/com.chabomakers.Antinote/Data/Documents/notes.sqlite3");
export const SETAPP_DB_PATH = resolve(
  homedir(),
  "Library/Containers/com.chabomakers.Antinote-setapp/Data/Documents/notes.sqlite3",
);

async function isAntinoteInstalled() {
  const applications = await getApplications();
  if (applications.some((app) => app.bundleId === "com.chabomakers.Antinote")) {
    return { installed: true, version: "standalone" };
  }

  if (applications.some((app) => app.bundleId === "com.chabomakers.Antinote-setapp")) {
    return { installed: true, version: "setapp" };
  }

  return { installed: false, version: null };
}

export async function checkAntinoteInstalled() {
  const isInstalled = await isAntinoteInstalled();
  if (!isInstalled) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Antinote is not installed",
      message: "Please install Antinote from Antinote.io",
      primaryAction: {
        title: "Go to https://antinote.io",
        onAction: (toast) => {
          open("https://antinote.io");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
  return isInstalled;
}

export async function getDatabasePath() {
  const isInstalled = await isAntinoteInstalled();
  if (isInstalled.version === "setapp") {
    return SETAPP_DB_PATH;
  }
  return DB_PATH;
}

export async function execSQLite<T = unknown>(query: string): Promise<T[]> {
  const dbPath = await getDatabasePath();

  try {
    const output = execFileSync("sqlite3", [dbPath, ".mode json", query], { encoding: "utf-8" });
    if (!output.trim()) return [];
    return JSON.parse(output);
  } catch (error) {
    console.error("SQLite Error:", error);
    throw new Error("Failed to execute database query");
  }
}
