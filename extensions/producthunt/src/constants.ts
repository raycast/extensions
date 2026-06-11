/**
 * Global constants for the Product Hunt extension
 */

// Base URL for Product Hunt
export const HOST_URL = "https://www.producthunt.com/";

// Raycast reloads an extension's command in a fresh process via this built-in deeplink. Needed
// because getPreferenceValues() is snapshotted at command launch: updated API credentials are NOT
// picked up by a running command (a plain Refresh re-reads the same stale snapshot). Reloading forces
// a new process that re-reads preferences, so it's the only way to apply just-edited keys in place.
export const RELOAD_EXTENSIONS_DEEPLINK = "raycast://extensions/raycast/raycast/reload-extensions";
