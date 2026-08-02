import { getClient } from "../lib/client";

type Input = {
  /** The domain to get backlinks for, e.g. "stripe.com". */
  domain: string;
  /** Maximum number of backlinks to return. Defaults to 20, max 1000. */
  limit?: number;
};

/**
 * Get backlinks pointing to a domain, including source domain, anchor text, and link type.
 * Costs 2 RankParse credits per call.
 */
export default async function tool(input: Input) {
  const client = getClient();
  const result = await client.backlinks(input.domain, { limit: input.limit ?? 20 });
  return result.data;
}
