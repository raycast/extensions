import { homedir } from "node:os";
import { join } from "node:path";

export const CONFIG_DIR = join(homedir(), ".config", "respace-raycast");
export const DATA_FILE = join(CONFIG_DIR, "workspaces.json");
export const SESSIONS_FILE = join(CONFIG_DIR, "sessions.json");
