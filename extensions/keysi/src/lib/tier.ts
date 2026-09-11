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
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { unlocked?: unknown };
    return { unlocked: parsed.unlocked === true, known: true };
  } catch {
    return { unlocked: false, known: false };
  }
}
