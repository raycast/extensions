import type { BulkCheckResponse } from "../utils/types";
import { ROOT_URL } from "../utils/config";
import getAnonymousUserID from "../utils/getAnonymousUserID";
import getUserAgent from "../utils/getUserAgent";

type Input = {
  /** The names of the domains to check availability (including the TLD) */
  domains: string[];
};

/**
 * Check domain availability, find popular extensions, and buy premium domains.
 */
export default async function tool(input: Input) {
  const { domains } = input;
  const searchParams = new URLSearchParams({
    names: domains.join(","),
  });
  const anonymousUserID = await getAnonymousUserID();
  const response = await fetch(`${ROOT_URL}/api/v1/bulk-check?${searchParams.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": getUserAgent(),
      "X-Requested-With": "Raycast-IDS",
      "X-Raycast-Anonymous-UUID": anonymousUserID,
    },
  });
  const data = (await response.json()) as BulkCheckResponse;
  return data.results.map((result) => ({
    domain: result.domain,
    action: result.backlink,
    availability: result.availability,
    price: result.aftermarket?.current_price,
  }));
}
