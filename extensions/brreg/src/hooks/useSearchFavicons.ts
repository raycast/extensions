import { useCallback, useEffect, useRef, useState } from "react";
import { getFavicon } from "@raycast/utils";
import type { Image } from "@raycast/api";
import type { Company, Enhet } from "../types";
import { normalizeWebsiteUrl } from "../utils/entity";

const SEARCH_FAVICON_LIMIT = 3;
const SEARCH_FAVICON_DEBOUNCE_MS = 350;
const SEARCH_FAVICON_CACHE_MAX = 300;

interface SearchFaviconEntry {
  website?: string;
  faviconUrl?: Image.ImageLike;
}

function pruneCache(cache: Map<string, SearchFaviconEntry>) {
  while (cache.size > SEARCH_FAVICON_CACHE_MAX) {
    const oldest = cache.keys().next().value as string | undefined;
    if (!oldest) return;
    cache.delete(oldest);
  }
}

export function useSearchFavicons(entities: Enhet[], favoriteById: Map<string, Enhet>) {
  const cacheRef = useRef(new Map<string, SearchFaviconEntry>());
  const [, setVersion] = useState(0);

  const setEntry = useCallback((orgNumber: string, entry: SearchFaviconEntry) => {
    const cache = cacheRef.current;
    if (cache.has(orgNumber)) cache.delete(orgNumber);
    cache.set(orgNumber, entry);
    pruneCache(cache);
  }, []);

  const getEntry = useCallback((orgNumber: string): SearchFaviconEntry | undefined => {
    const cache = cacheRef.current;
    const existing = cache.get(orgNumber);
    if (!existing) return undefined;

    // Promote to most recently used.
    cache.delete(orgNumber);
    cache.set(orgNumber, existing);
    return existing;
  }, []);

  useEffect(() => {
    if (entities.length === 0) return;

    const timer = setTimeout(() => {
      const topResults = entities.slice(0, SEARCH_FAVICON_LIMIT);
      let changed = false;

      for (const entity of topResults) {
        const orgNumber = entity.organisasjonsnummer;
        const favorite = favoriteById.get(orgNumber);
        if (favorite?.emoji || favorite?.faviconUrl) continue;

        const cached = getEntry(orgNumber);
        if (cached?.faviconUrl) continue;

        const website = normalizeWebsiteUrl(entity.website ?? entity.hjemmeside);
        if (!website) continue;

        setEntry(orgNumber, {
          website,
          faviconUrl: getFavicon(website),
        });
        changed = true;
      }

      if (changed) setVersion((v) => v + 1);
    }, SEARCH_FAVICON_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [entities, favoriteById, getEntry, setEntry]);

  const getSearchFavicon = useCallback(
    (orgNumber: string): Image.ImageLike | undefined => getEntry(orgNumber)?.faviconUrl,
    [getEntry],
  );

  const upsertFromFavorite = useCallback(
    (entity: Enhet) => {
      const website = normalizeWebsiteUrl(entity.website ?? entity.hjemmeside);
      const faviconUrl = entity.faviconUrl ?? (website ? getFavicon(website) : undefined);
      if (!website && !faviconUrl) return;

      setEntry(entity.organisasjonsnummer, {
        website,
        faviconUrl,
      });
      setVersion((v) => v + 1);
    },
    [setEntry],
  );

  const upsertFromDetails = useCallback(
    (company: Company | null | undefined) => {
      if (!company) return;

      const website = normalizeWebsiteUrl(company.website);
      const faviconUrl = website ? getFavicon(website) : undefined;
      if (!website && !faviconUrl) return;

      setEntry(company.organizationNumber, {
        website,
        faviconUrl,
      });
      setVersion((v) => v + 1);
    },
    [setEntry],
  );

  return {
    getSearchFavicon,
    upsertFromFavorite,
    upsertFromDetails,
  };
}
