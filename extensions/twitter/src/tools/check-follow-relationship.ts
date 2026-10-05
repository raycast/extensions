import { clientV2 } from "../v2/lib/twitterapi_v2";

type Input = {
  /** Exact username of the potential follower. For "does A follow B?", this is A, not the signed-in account. */
  sourceUsername: string;
  /** Exact username of the account potentially followed. For "does A follow B?", this is B. */
  targetUsername: string;
  /** Maximum billed following pages to inspect, from 1 to 10. Defaults to 10, each with up to 1,000 users. */
  maxPages?: number;
};

/**
 * Verify whether source follows target by exact user IDs. Scans from the start and stops on a match or a complete list.
 * A page limit, partial data, or API failure returns unverified, never not_following. Does not follow or unfollow anyone.
 */
export default async function checkFollowRelationship(input: Input) {
  return await clientV2.checkFollowRelationship(input.sourceUsername, input.targetUsername, input.maxPages);
}
