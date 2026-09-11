import { homedir } from "os";
import { join } from "path";
import { readFileSync } from "fs";

/**
 * Whether Keysi's integrations are unlocked.
 *
 * Keysi writes this file at launch and on every tier change; see
 * `IntegrationTierFile` on the Swift side, which documents why a file is the
 * only channel available for the one command that never talks to the app.
 *
 * A missing or unreadable file means locked. That is the safe direction and
 * also the correct one for the most likely cause: Keysi has never been run.
 */
export const TIER_FILE = join(homedir(), "Library", "Application Support", "Keysi", "integration-tier.json");

export interface TierStatus {
  unlocked: boolean;
  /** False when Keysi appears never to have run, which needs different wording. */
  known: boolean;
}

export function readTier(path: string = TIER_FILE): TierStatus {
  let contents: string;
  try {
    contents = readFileSync(path, "utf8");
  } catch {
    // No file at all. The overwhelmingly likely cause is that Keysi has
    // never been run — or is not installed — which needs different wording
    // from "you need Pro", and `known: false` is what selects it.
    return { unlocked: false, known: false };
  }
  try {
    const parsed = JSON.parse(contents) as { unlocked?: unknown };
    return { unlocked: parsed.unlocked === true, known: true };
  } catch {
    // The file exists but is unreadable, so Keysi *has* run and this is a
    // corrupt or partially-written file rather than a fresh machine.
    // Collapsing this into `known: false` told someone who may well own Pro
    // to go install the app — which was the previous behaviour, and wrong.
    // Locked either way: an unparseable tier file is not proof of anything.
    return { unlocked: false, known: true };
  }
}
