/**
 * Global constants for the Product Hunt extension
 */

// Base URL for Product Hunt
export const HOST_URL = "https://www.producthunt.com/";

// Raycast reloads an extension's command in a fresh process via this built-in deeplink. Needed
// because getPreferenceValues() and the OAuth token are snapshotted at command launch: a running
// command won't see just-changed preferences or a fresh sign-in/sign-out until the process
// restarts (a plain Refresh re-reads the same stale snapshot). Reloading forces a new process.
export const RELOAD_EXTENSIONS_DEEPLINK = "raycast://extensions/raycast/raycast/reload-extensions";
