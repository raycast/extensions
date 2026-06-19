import { homedir } from "os";
import { join } from "path";

const HANDY_SUPPORT_DIR = join(
  homedir(),
  "Library",
  "Application Support",
  "com.pais.handy",
);

export const DB_PATH = join(HANDY_SUPPORT_DIR, "history.db");
export const SETTINGS_PATH = join(HANDY_SUPPORT_DIR, "settings_store.json");
export const RECORDINGS_DIR = join(HANDY_SUPPORT_DIR, "recordings");
export const MODELS_DIR = join(HANDY_SUPPORT_DIR, "models");
