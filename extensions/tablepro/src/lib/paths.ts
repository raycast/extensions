import { homedir } from "os";
import { join } from "path";
import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";

const APP_SUPPORT_RELATIVE = "Library/Application Support/TablePro";

export function appSupportDir(): string {
  return join(homedir(), APP_SUPPORT_RELATIVE);
}

export function connectionsFilePath(): string {
  return join(appSupportDir(), "connections.json");
}

export function handshakeFilePath(): string {
  return join(appSupportDir(), "mcp-handshake.json");
}

export function tableProAppPath(): string {
  const { tableProAppPath } = getPreferenceValues<Preferences>();
  return tableProAppPath?.path ?? "/Applications/TablePro.app";
}

export function tableProInstalled(): boolean {
  return existsSync(tableProAppPath());
}
