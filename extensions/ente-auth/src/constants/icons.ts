import { environment } from "@raycast/api";
import path from "path";

// Ente's community-maintained custom icon registry (mirrors the Alfred extension's sources).
export const ENTE_ICONS_DATABASE_URL =
	"https://raw.githubusercontent.com/ente-io/ente/refs/heads/main/mobile/apps/auth/assets/custom-icons/_data/custom-icons.json";

export const ENTE_CUSTOM_ICONS_URL =
	"https://raw.githubusercontent.com/ente-io/ente/refs/heads/main/mobile/apps/auth/assets/custom-icons/icons/";

// Simple Icons CDN. Returns each icon in its brand color by default, so no bundling of the
// (very large) simple-icons npm package is required.
export const SIMPLE_ICONS_CDN_URL = "https://cdn.simpleicons.org/";

// Where downloaded service icons are cached on disk.
export const ICONS_DIR = path.join(environment.supportPath, "service_icons");

// LocalStorage key tracking services we failed to find an icon for, so we don't refetch every load.
// The version suffix is bumped whenever the matching logic changes, so stale misses recorded under
// the old logic are abandoned and every service is re-attempted with the new matching.
export const ICON_MISSES_KEY = "ente-auth-icon-misses-v2";

// How long to wait before retrying a previously-missed icon lookup.
export const ICON_MISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
