import { clientV2 } from "../v2/lib/twitterapi_v2";

type Input = {
  /** One to eight names, usernames, or profile terms that must all match. Use only terms that identify the person. */
  terms: string[];
  /** Maximum matching profiles to return. Defaults to 20 and must be between 1 and 100. */
  limit?: number;
};

/**
 * Search the authenticated user's following for matching profiles, falling back to followers only when following has
 * no matches. The search paginates internally and returns only matches, so it can resolve a remembered name to a
 * username without exposing a full social graph page.
 */
export default async function searchMyConnections(input: Input) {
  return await clientV2.searchMyConnections(input.terms, input.limit);
}
