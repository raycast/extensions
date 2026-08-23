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
    url: entry.url,
    walkedAt: entry.walkedAt,
    message: "A new path through The Forest was found and saved to walk history.",
  };
}
