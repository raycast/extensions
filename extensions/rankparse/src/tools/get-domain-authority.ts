import { getClient } from "../lib/client";

type Input = {
  /** The domain to get the authority score for, e.g. "stripe.com". */
  domain: string;
};

/**
 * Get the domain authority score, backlink count, and referring domain count for a domain.
 * Costs 1 RankParse credit per call.
 */
export default async function tool(input: Input) {
  const client = getClient();
  const result = await client.domainAuthority(input.domain);
  return result.data;
}
