import { readdir } from "node:fs/promises";
import { showError } from "@chrismessina/raycast-kit";
import { Cache, launchCommand, LaunchType, LocalStorage, showHUD } from "@raycast/api";
import { signOut } from "./lib/cosign-mcp";
import { forgetListIds } from "./lib/favorites";

const RECENTS = ["people", "companies", "topics"];

/**
 * Cosign results are cached by `useCachedPromise`, one Cache namespace per fetch function (a 40-character hash), so
 * they would otherwise show the previous account on the next open. View settings live in the default namespace and
 * stay. Raycast doesn't list namespaces, so they are read from the cache's own folder.
 */
async function clearCachedResults() {
  const folders = await readdir(new Cache().storageDirectory);
  for (const namespace of folders.filter((name) => /^[0-9a-f]{40}$/.test(name))) new Cache({ namespace }).clear();
}

export default async function Command() {
  try {
    await signOut();
    await forgetListIds();
    await Promise.all(RECENTS.map((key) => LocalStorage.removeItem(`recent-searches:${key}`)));
    await clearCachedResults();
    // Redraw the menu bar now, from the emptied cache and with no tokens, instead of at its next 10-minute refresh.
    await launchCommand({ name: "inbox-menu-bar", type: LaunchType.Background }).catch(() => undefined);
    await showHUD("Signed out of Cosign");
  } catch (error) {
    await showError(error, { title: "Couldn’t sign out" });
  }
}
