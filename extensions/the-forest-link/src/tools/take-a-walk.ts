import { recordWalk } from "../walk-history";
import { resolveWalkDestination } from "../the-forest";

/**
 * Picks a random website from The Forest and saves the discovery to local walk history.
 * Returns a link for the user; it does not automatically open a browser.
 */
export default async function takeAWalk() {
  const url = await resolveWalkDestination();
  const entry = await recordWalk(url);

  return {
    url,
    walkedAt: entry?.walkedAt,
    savedToHistory: Boolean(entry),
    message: entry
      ? "A new path through The Forest was found and saved to walk history."
      : "A new path through The Forest was found, but an overlapping history clear prevented it from being saved.",
  };
}
