import type { ContentfulClientApi, Entry } from "contentful";
import type {
  ContentfulEntry,
  ContentTypeInfo,
  EntryFields,
  SpaceConfig,
  SpaceSearchResult,
} from "../types/contentful";
import { buildWebAppUrl, extractEntryTitle } from "../utils/entry-helpers";
import { createClients } from "./contentful-client";

/**
 * Search for entries in a single space
 * @param client - Contentful client
 * @param spaceConfig - Space configuration
 * @param query - Search query string
 * @returns Promise resolving to SpaceSearchResult
 */
async function searchInSpace(
  client: ContentfulClientApi<undefined>,
  spaceConfig: SpaceConfig,
  query: string
): Promise<SpaceSearchResult> {
  try {
    const response = await client.getEntries({
      query,
      limit: 100,
      order: ["-sys.updatedAt"],
    });

    return {
      spaceConfig,
      entries: response.items,
    };
  } catch (error) {
    return {
      spaceConfig,
      entries: [],
      error:
        error instanceof Error ? error : new Error("Unknown error occurred"),
    };
  }
}

/**
 * Map a Contentful entry to our normalized ContentfulEntry type
 * @param entry - Raw Contentful entry
 * @param spaceConfig - Space configuration
 * @returns Normalized ContentfulEntry
 */
function mapToContentfulEntry(
  entry: Entry,
  spaceConfig: SpaceConfig
): ContentfulEntry {
  const fields = entry.fields as EntryFields;
  const contentType = entry.sys.contentType?.sys.id || "Unknown";

  return {
    id: entry.sys.id,
    title: extractEntryTitle(fields, entry.sys.id),
    contentType,
    contentTypeId: contentType,
    spaceName: spaceConfig.name,
    spaceId: spaceConfig.spaceId,
    environment: spaceConfig.environment || "master",
    updatedAt: entry.sys.updatedAt,
    url: buildWebAppUrl(
      spaceConfig.spaceId,
      spaceConfig.environment || "master",
      entry.sys.id
    ),
    rawEntry: entry,
  };
}

/**
 * Fetch latest entries from a single space
 * @param client - Contentful client
 * @param spaceConfig - Space configuration
 * @param limit - Maximum number of entries to fetch
 * @param contentTypeId - Optional content type ID to filter by
 * @returns Promise resolving to SpaceSearchResult
 */
async function fetchLatestFromSpace(
  client: ContentfulClientApi<undefined>,
  spaceConfig: SpaceConfig,
  limit: number,
  contentTypeId?: string
): Promise<SpaceSearchResult> {
  try {
    const queryParams: Parameters<typeof client.getEntries>[0] = contentTypeId
      ? {
          limit,
          order: ["-sys.updatedAt"],
          content_type: contentTypeId,
        }
      : {
          limit,
          order: ["-sys.updatedAt"],
        };

    const response = await client.getEntries(queryParams);

    return {
      spaceConfig,
      entries: response.items,
    };
  } catch (error) {
    return {
      spaceConfig,
      entries: [],
      error:
        error instanceof Error ? error : new Error("Unknown error occurred"),
    };
  }
}

/**
 * Fetch latest updated entries across multiple spaces
 * @param spaceConfigs - Array of space configurations
 * @param limit - Maximum number of entries per space (default: 10)
 * @param contentTypeId - Optional content type ID to filter by (or "all" for no filter)
 * @returns Promise resolving to array of ContentfulEntry objects
 */
export async function fetchLatestEntries(
  spaceConfigs: SpaceConfig[],
  limit = 10,
  contentTypeId?: string
): Promise<ContentfulEntry[]> {
  const clients = createClients(spaceConfigs);

  // Use content type filter if provided and not "all"
  const filterContentTypeId =
    contentTypeId && contentTypeId !== "all" ? contentTypeId : undefined;

  // Fetch latest from all spaces in parallel
  const fetchPromises = clients.map(([config, client]) =>
    fetchLatestFromSpace(client, config, limit, filterContentTypeId)
  );

  const results = await Promise.all(fetchPromises);

  // Merge and transform results
  const allEntries = results.flatMap((result) => {
    if (result.error) {
      console.error(
        `Error fetching from space ${result.spaceConfig.name}:`,
        result.error
      );
      return [];
    }
    return result.entries.map((entry) =>
      mapToContentfulEntry(entry, result.spaceConfig)
    );
  });

  // Sort by updated date (newest first)
  return allEntries.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Search entries across multiple Contentful spaces in parallel
 * @param spaceConfigs - Array of space configurations
 * @param query - Search query string
 * @returns Promise resolving to array of ContentfulEntry objects
 */
export async function searchEntries(
  spaceConfigs: SpaceConfig[],
  query: string
): Promise<ContentfulEntry[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const clients = createClients(spaceConfigs);

  // Search all spaces in parallel
  const searchPromises = clients.map(([config, client]) =>
    searchInSpace(client, config, query.trim())
  );

  const results = await Promise.all(searchPromises);

  // Merge and transform results
  const allEntries = results.flatMap((result) => {
    if (result.error) {
      console.error(
        `Error searching space ${result.spaceConfig.name}:`,
        result.error
      );
      return [];
    }
    return result.entries.map((entry) =>
      mapToContentfulEntry(entry, result.spaceConfig)
    );
  });

  // Sort by updated date (newest first)
  return allEntries.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Get content types from a single space
 * @param client - Contentful client
 * @param spaceConfig - Space configuration
 * @returns Promise resolving to array of ContentTypeInfo
 */
async function getContentTypesFromSpace(
  client: ContentfulClientApi<undefined>,
  spaceConfig: SpaceConfig
): Promise<ContentTypeInfo[]> {
  try {
    const contentTypes = await client.getContentTypes();
    return contentTypes.items.map((ct) => ({
      id: ct.sys.id,
      name: ct.name,
      spaceId: spaceConfig.spaceId,
      spaceName: spaceConfig.name,
    }));
  } catch (error) {
    console.error(
      `Error fetching content types from space ${spaceConfig.name}:`,
      error
    );
    return [];
  }
}

/**
 * Fetch all content types across multiple spaces
 * @param spaceConfigs - Array of space configurations
 * @returns Promise resolving to array of unique ContentTypeInfo objects (unique by id)
 */
export async function fetchAllContentTypes(
  spaceConfigs: SpaceConfig[]
): Promise<ContentTypeInfo[]> {
  const clients = createClients(spaceConfigs);

  // Fetch content types from all spaces in parallel
  const fetchPromises = clients.map(([config, client]) =>
    getContentTypesFromSpace(client, config)
  );

  const results = await Promise.all(fetchPromises);

  // Flatten all content types
  const allContentTypes = results.flat();

  // Deduplicate by id, keeping the first occurrence
  const uniqueContentTypes = new Map<string, ContentTypeInfo>();
  for (const ct of allContentTypes) {
    if (!uniqueContentTypes.has(ct.id)) {
      uniqueContentTypes.set(ct.id, ct);
    }
  }

  return Array.from(uniqueContentTypes.values());
}
