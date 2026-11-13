import { homedir } from "node:os";
import { join } from "node:path";

export const EGO_LITE_BUNDLE_ID = "com.citrolabs.ego.lite";
export const EGO_LITE_WEBSITE = "https://lite.ego.app/";
export const EGO_LITE_DATA_ROOT = join(homedir(), "Library", "Application Support", "Citro Labs", "ego lite");
export const LOCAL_STATE_PATH = join(EGO_LITE_DATA_ROOT, "Local State");
export const HISTORY_RESULT_LIMIT = 100;
