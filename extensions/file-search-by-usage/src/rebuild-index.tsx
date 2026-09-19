import { rebuildWithFeedback } from "./lib/index-rebuild";

/**
 * Rebuild the search index on request.
 *
 * The same work as the Rebuild Search Index action, reachable from Raycast's
 * root so it does not require opening the search first. Nothing schedules this.
 */
export default async function Command() {
  await rebuildWithFeedback();
}
