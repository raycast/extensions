import { startPractice } from "./lib/keysi";
import { showLockedToast } from "./lib/locked";
import { readTier } from "./lib/tier";

/**
 * Practice Shortcuts.
 *
 * Keysi refuses this over `keysi://` too, and opens its License settings
 * when it does — so the check here is not the lock, it is the explanation.
 * Without it the only feedback would be Keysi's Settings window appearing
 * for no stated reason.
 */
export default async function Command() {
  const tier = readTier();
  if (!tier.unlocked) {
    await showLockedToast(tier);
    return;
  }
  await startPractice();
}
