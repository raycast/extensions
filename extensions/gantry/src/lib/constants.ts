import { homedir } from "os";

const home = homedir();

export const PLIST_DIRS = [
  { dir: `${home}/Library/LaunchAgents`, source: "user" as const },
  { dir: "/Library/LaunchAgents", source: "system-agent" as const },
  { dir: "/Library/LaunchDaemons", source: "system-daemon" as const },
] as const;

export const REFRESH_INTERVAL_MS = 30_000;
