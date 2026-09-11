import { resolve } from "path";
import { homedir } from "os";

export const STABLE_DB_PATH = resolve(
  homedir(),
  "Library/Containers/com.chabomakers.Antinote/Data/Documents/notes.sqlite3",
);
export const BETA_DB_PATH = resolve(
  homedir(),
  "Library/Containers/com.chabomakers.Antinote/Data/Library/Application Support/cd-v1-notes.sqlite",
);
export const SETAPP_DB_PATH = resolve(
  homedir(),
  "Library/Containers/com.chabomakers.Antinote-setapp/Data/Documents/notes.sqlite3",
);
