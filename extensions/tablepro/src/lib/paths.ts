import { homedir } from "os";
import { join } from "path";
import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";
import { Preferences } from "./types";

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
  const prefs = getPreferenceValues<Preferences>();
  const value = prefs.tableProAppPath;
  if (!value) {
    return "/Applications/TablePro.app";
  }
  if (typeof value === "string") {
    return value;
  }
  return value.path ?? "/Applications/TablePro.app";
}

export function tableProInstalled(): boolean {
  return existsSync(tableProAppPath());
}
