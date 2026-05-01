import { homedir } from "os";
import path from "path";

export const BUNDLE_ID = "com.ariestwn.lossless-switcher";

const HOME = homedir();

export const SUPPORT_DIR = path.join(
  HOME,
  "Library",
  "Application Support",
  BUNDLE_ID,
);
export const CACHE_DIR = path.join(HOME, "Library", "Caches", BUNDLE_ID);
export const LAUNCH_AGENTS_DIR = path.join(HOME, "Library", "LaunchAgents");

export const NOWPLAYING_PATH = path.join(CACHE_DIR, "nowplaying.json");
export const APPLY_LOG_PATH = path.join(CACHE_DIR, "apply.log");
export const ARTWORK_DIR = path.join(CACHE_DIR, "artwork");

export const WATCHER_BIN = path.join(SUPPORT_DIR, "lossless-watcher");
export const AUDIO_FORMAT_BIN = path.join(SUPPORT_DIR, "audio_format");
export const PLIST_PATH = path.join(LAUNCH_AGENTS_DIR, `${BUNDLE_ID}.plist`);

export const AUTOAPPLY_OFF_FLAG = path.join(SUPPORT_DIR, "autoapply.off");
export const DAEMON_OFF_FLAG = path.join(SUPPORT_DIR, "daemon.off");
