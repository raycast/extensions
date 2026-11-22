import { homedir } from "os";
import { join } from "path";

export const APP_NAME = "Claude Usage";
export const APP_BUNDLE_ID = "HamedElfayome.Claude-Usage";
export const APP_CANDIDATES = [`/Applications/${APP_NAME}.app`, join(homedir(), "Applications", `${APP_NAME}.app`)];
export const APP_HOMEPAGE = "https://github.com/hamed-elfayome/Claude-Usage-Tracker";

/** The app keeps its profiles, including the latest usage reading, in its preferences file. */
export const PLIST_PATH = join(homedir(), "Library", "Preferences", `${APP_BUNDLE_ID}.plist`);
export const PROFILES_KEY = "profiles_v3";
export const ACTIVE_PROFILE_KEY = "activeProfileId";

/** One JSON file per profile, appended to whenever a session or a week resets. */
export const HISTORY_DIR = join(homedir(), "Library", "Application Support", APP_NAME, "history");

export const SESSION_MINUTES = 300;
export const WEEK_MINUTES = 10080;

/** A reading older than this means the app is not running (it refreshes every 30s by default). */
export const MIN_STALE_AFTER_MS = 10 * 60_000;
