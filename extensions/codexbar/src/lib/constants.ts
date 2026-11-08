import { homedir } from "os";
import { join } from "path";

export const APP_BUNDLE_ID = "com.steipete.codexbar";
export const APP_PATH = "/Applications/CodexBar.app";
export const APP_HOMEPAGE = "https://github.com/steipete/CodexBar";

/** Group Container folders are prefixed with the developer team id, e.g. `ABCDE12345.com.steipete.codexbar`. */
export const GROUP_CONTAINERS_DIR = join(homedir(), "Library", "Group Containers");
export const GROUP_CONTAINER_SUFFIX = `.${APP_BUNDLE_ID}`;
export const SNAPSHOT_FILE = "widget-snapshot.json";

/** The CLI ships inside the app bundle; Homebrew installs also link it on PATH. */
export const CLI_CANDIDATES = [
  join(APP_PATH, "Contents", "Helpers", "CodexBarCLI"),
  join(homedir(), "Applications", "CodexBar.app", "Contents", "Helpers", "CodexBarCLI"),
  "/opt/homebrew/bin/codexbar",
  "/usr/local/bin/codexbar",
];

/** `codexbar usage` contacts every provider and can take ~30s. */
export const USAGE_TIMEOUT_MS = 90_000;
/** `codexbar cost` reads local logs through a scan cache and is usually fast. */
export const COST_TIMEOUT_MS = 60_000;
