import { usePromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";
import { showNamecheapError } from "./errors";
import { clearPricingCache, currentScope, getClient, getPricing } from "./preferences";
import { readDomainSnapshot, writeDomainSnapshot } from "./storage";
import type { Domain, DomainCheckResult, DomainListType, PricingTable } from "./namecheap/types";

const EMPTY_PRICING: PricingTable = {};

/**
 * The user's domains.
 *
 * Deliberately `usePromise` rather than `useCachedPromise`: the cached variant writes its results to plain
 * JSON files on disk, and a person's domain portfolio does not belong there. The snapshot that keeps the
 * command useful after a failed refresh goes to Raycast's encrypted store instead.
 */
export function useDomains(listType: DomainListType) {
  const [snapshot, setSnapshot] = useState<{ domains: Domain[]; at: number } | null>(null);

  const result = usePromise(
    async (type: DomainListType) => {
      const client = await getClient();
      const domains = await client.listAllDomains({ listType: type });
      await writeDomainSnapshot(currentScope(), type, domains);
      return domains;
    },
    [listType],
    {
      onData: () => setSnapshot(null),
      onError: async (error) => {
        showNamecheapError(error, "Could not load your domains");
        setSnapshot((await readDomainSnapshot(currentScope(), listType)) ?? null);
      },
    },
  );

  const stale = result.error ? snapshot : null;
  return {
    ...result,
    data: result.data ?? stale?.domains ?? [],
    /** When set, the list on screen came from the encrypted snapshot rather than from Namecheap. */
    staleAt: stale?.at,
  };
}

/**
 * Availability results. Also uncached on disk: what someone is searching for is an unregistered idea, and
 * those should not sit in a plaintext file.
 */
export function useAvailability(candidates: string[]) {
  const previous = useRef<DomainCheckResult[]>([]);

  const result = usePromise(async (domains: string[]) => (await getClient()).checkDomains(domains), [candidates], {
    execute: candidates.length > 0,
    onError: (error) => {
      showNamecheapError(error, "Could not check availability");
    },
  });

  if (result.data) previous.current = result.data;
  // Holding the last results in memory keeps the list from flickering between searches.
  return { ...result, data: result.data ?? (result.isLoading ? previous.current : []) };
}

/** TLD pricing. Public data, so this one is cached on disk; `refresh` drops the cache first. */
export function usePricing() {
  const result = usePromise(getPricing, [], {
    onError: () => undefined,
  });

  const refresh = useCallback(() => {
    clearPricingCache();
    return result.revalidate();
  }, [result]);

  return { ...result, data: result.data ?? EMPTY_PRICING, refresh };
}
