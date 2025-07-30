import { callCoreApi } from "../api";
import { DNSRecord } from "../types";

type Input = {
  /**
   * The domain name
   */
  domainName: string;
};

/**
 * Lists the DNS Records in Domain.
 * Search for the domain using `list-domains` first
 */
export default async function (input: Input) {
  const result = await callCoreApi<{ records: DNSRecord[] }>(`domains/${input.domainName}/records`);
  return result.records;
}
