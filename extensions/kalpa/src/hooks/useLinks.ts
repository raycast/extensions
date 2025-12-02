/**
 * Custom hooks for fetching Kalpa data
 */

import { useCachedPromise } from "@raycast/utils";
import { getKalpaClient } from "../utils/kalpa-client";
import type { LinkSearchOptions } from "../types";

/**
 * Hook to fetch links with search and filters
 */
export function useLinks(options: LinkSearchOptions = {}) {
  const client = getKalpaClient();

  return useCachedPromise(
    async (opts: LinkSearchOptions) => {
      const result = await client.getLinks(opts);
      return result.page;
    },
    [options],
    {
      keepPreviousData: true,
    }
  );
}

/**
 * Hook to fetch videos
 */
export function useVideos(options: LinkSearchOptions = {}) {
  const client = getKalpaClient();

  return useCachedPromise(
    async (opts: LinkSearchOptions) => {
      const result = await client.getVideos(opts);
      return result.page;
    },
    [options],
    {
      keepPreviousData: true,
    }
  );
}

/**
 * Hook to fetch CodePen links
 */
export function useCodepenLinks() {
  const client = getKalpaClient();

  return useCachedPromise(async () => {
    const result = await client.getCodepenLinks();
    return result.page;
  }, []);
}

/**
 * Hook to fetch all links (pages + videos + codepen)
 */
export function useAllLinks(options: LinkSearchOptions = {}) {
  const client = getKalpaClient();

  return useCachedPromise(
    async (opts: LinkSearchOptions) => {
      // Convex queries already strip heavy fields (content, selection)
      // Use reasonable limit for good UX
      const effectiveNumItems = opts.numItems || 100;
      const fetchOpts = { ...opts, numItems: effectiveNumItems };

      try {
        // Fetch sequentially to reduce memory pressure on self-hosted Convex
        const linksResult = await client.getLinks(fetchOpts);
        const videosResult = await client.getVideos(fetchOpts);
        const codepenResult = await client.getCodepenLinks(effectiveNumItems, opts.universeId);

        // Combine and sort by creation time
        const allLinks = [...linksResult.page, ...videosResult.page, ...codepenResult.page];
        return allLinks.sort((a, b) => b._creationTime - a._creationTime);
      } catch (error) {
        // Log error for debugging
        console.error("useAllLinks error:", error);
        // Return empty array on auth errors - let the UI handle showing login prompt
        if (error instanceof Error && error.message.includes("Authentication")) {
          return [];
        }
        throw error;
      }
    },
    [options],
    {
      keepPreviousData: true,
    }
  );
}

/**
 * Hook to fetch universes
 */
export function useUniverses() {
  const client = getKalpaClient();

  return useCachedPromise(async () => {
    return await client.getUniverses();
  }, []);
}

/**
 * Hook to fetch tags
 */
export function useTags(contentType?: "links" | "videos") {
  const client = getKalpaClient();

  return useCachedPromise(
    async (type?: "links" | "videos") => {
      return await client.getTags(type);
    },
    [contentType]
  );
}

/**
 * Hook to fetch a single link
 */
export function useLink(linkId: string) {
  const client = getKalpaClient();

  return useCachedPromise(
    async (id: string) => {
      return await client.getLink(id);
    },
    [linkId]
  );
}
