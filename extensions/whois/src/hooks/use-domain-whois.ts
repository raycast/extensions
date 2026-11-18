import { useCachedPromise } from "@raycast/utils";
import { fetchDomainDates } from "@/utils/whois-domain";

/**
 * Hook to fetch domain WHOIS data using whoiser + RDAP fallback.
 * Results are cached by Raycast between command invocations.
 */
const useDomainWhois = (domain: string, execute = true) => {
  return useCachedPromise(
    async (d: string) => {
      return fetchDomainDates(d);
    },
    [domain],
    {
      execute: execute && domain.length > 0,
      keepPreviousData: true,
    },
  );
};

export default useDomainWhois;
