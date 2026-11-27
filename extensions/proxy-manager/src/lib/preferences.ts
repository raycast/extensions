import { getPreferenceValues } from "@raycast/api";
import { homedir } from "node:os";
import { join } from "node:path";

export function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

function readPreferences(): Preferences {
  // `Preferences` is generated from package.json into raycast-env.d.ts.
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
