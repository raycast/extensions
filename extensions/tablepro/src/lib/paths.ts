import { homedir } from "os";
import { join } from "path";

const APP_SUPPORT_RELATIVE = "Library/Application Support/TablePro";

export function appSupportDir(): string {
  return join(homedir(), APP_SUPPORT_RELATIVE);
}

export function connectionsFilePath(): string {
  return join(appSupportDir(), "connections.json");
}
