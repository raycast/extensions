import { getPreferenceValues } from "@raycast/api";
import { homedir } from "node:os";
import { join } from "node:path";

interface Preferences {
  appPath?: string;
  supportDirectory?: string;
}

export function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

function readPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

/** ProxyManager's app-support folder; override only when the user moved their data. */
export function supportDirectory(): string {
  const configured = readPreferences().supportDirectory?.trim();
  return expandHome(configured || join(homedir(), "Library/Application Support/ProxyManager"));
}

export function socketPath(): string {
  return join(supportDirectory(), "control.sock");
}

export function tokenPath(): string {
  return join(supportDirectory(), "control.token");
}

export function appPath(): string {
  return expandHome(readPreferences().appPath?.trim() || "/Applications/ProxyManager.app");
}
