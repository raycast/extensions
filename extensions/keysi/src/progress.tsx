import { showProgress } from "./lib/keysi";
import { showLockedToast } from "./lib/locked";
import { readTier } from "./lib/tier";

/**
 * Show Progress — Keysi's recap of which shortcuts you've actually learned.
 *
 * Gated like the others, and for the same reason: reaching Keysi from
 * somewhere else is the paid surface. The app refuses `keysi://progress`
 * too; this is the half that explains why.
 */
export default async function Command() {
  const tier = readTier();
  if (!tier.unlocked) {
    await showLockedToast(tier);
    return;
  }
  await showProgress();
}
