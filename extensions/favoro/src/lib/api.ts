import { getAccessToken } from "./oauth";
import { API_BASE_URL, USER_AGENT, ENDPOINTS } from "./constants";
import { ApiError, AuthError } from "./errors";
import type {
  ApiResponse,
  ApiErrorResponse,
  SearchResponse,
  SearchResultLink,
  FavoroArea,
  FavoroSection,
  FavoroLink,
  BookmarksExportResponse,
  CachedData,
} from "../types";

// Re-export error classes and type guards for convenience
export { ApiError, AuthError, isApiError, isAuthError } from "./errors";

/**
 * Makes an authenticated request to the FAVORO API.
 * Automatically handles token retrieval and refresh.
 */
async function fetchRaw<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      "X-Client": USER_AGENT,
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthError("Authentication expired. Please reconnect.");
    }

    let errorDetails: ApiErrorResponse | undefined;
    try {
      errorDetails = (await response.json()) as ApiErrorResponse;
    } catch {
      // Response body is not JSON
    }

    const errorMessage =
      errorDetails?.errors?.[0]?.detail ?? errorDetails?.errors?.[0]?.title ?? `API error: ${response.status}`;

    throw new ApiError(errorMessage, response.status, errorDetails);
  }

  return (await response.json()) as T;
}

/**
 * Makes an authenticated request to the FAVORO API.
 * Returns the full JSON:API response with data, included, and meta.
 */
export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  return fetchRaw<ApiResponse<T>>(endpoint, options);
}

/**
 * Union type for all resource types in the API
 */
type AnyFavoroResource = FavoroArea | FavoroSection | FavoroLink;

/**
 * Type guard to check if a resource is a FavoroArea
 */
function isFavoroArea(resource: AnyFavoroResource): resource is FavoroArea {
  return resource.type === "area";
}

/**
 * Type guard to check if a resource is a FavoroSection
 */
function isFavoroSection(resource: AnyFavoroResource): resource is FavoroSection {
  return resource.type === "section";
}

/**
 * Type guard to check if a resource is a FavoroLink
 */
function isFavoroLink(resource: AnyFavoroResource): resource is FavoroLink {
  return resource.type === "link";
}

/**
 * Searches for links matching the given query.
 * Returns links with expanded area and section metadata.
 */
export async function searchLinks(query: string): Promise<SearchResultLink[]> {
  if (!query.trim()) {
    return [];
  }

  const searchResponse = await fetchRaw<SearchResponse>(`${ENDPOINTS.SEARCH}?q=${encodeURIComponent(query)}`);
  const links = searchResponse.data;
  const included = searchResponse.included ?? [];

  // Build lookup maps for areas and sections
  const areaMap = new Map<string, { id: string; name: string }>();
  const sectionMap = new Map<string, { id: string; name: string }>();

  for (const resource of included) {
    if (isFavoroArea(resource)) {
      areaMap.set(resource.id, { id: resource.id, name: resource.attributes.name });
    } else if (isFavoroSection(resource)) {
      sectionMap.set(resource.id, { id: resource.id, name: resource.attributes.title });
    }
  }

  // Enrich links with area and section metadata
  return links.map((link): SearchResultLink => {
    const areaRef = link.relationships?.area?.data;
    const sectionRef = link.relationships?.section?.data;

    const areaId = areaRef && !Array.isArray(areaRef) ? areaRef.id : undefined;
    const sectionId = sectionRef && !Array.isArray(sectionRef) ? sectionRef.id : undefined;

    return {
      ...link,
      area: areaId ? areaMap.get(areaId) : undefined,
      section: sectionId ? sectionMap.get(sectionId) : undefined,
    };
  });
}

/**
 * Result from fetchBookmarks - either new data or "not modified" indicator
 */
export interface FetchBookmarksResult {
  status: "ok" | "not_modified";
  data?: CachedData;
}

/**
 * Fetches all bookmarks from the export endpoint.
 * Supports conditional requests via ETag for efficient cache validation.
 *
 * @param etag - Optional ETag from previous request for conditional fetch
 * @returns CachedData if new data, or "not_modified" if cache is still valid
 */
export async function fetchBookmarks(etag?: string): Promise<FetchBookmarksResult> {
  const token = await getAccessToken();

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    "X-Client": USER_AGENT,
  };

  // Add If-None-Match header for conditional request
  if (etag) {
    headers["If-None-Match"] = etag;
  }

  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.BOOKMARKS}`, {
    method: "GET",
    headers,
  });

  // Handle 304 Not Modified - cache is still valid
  if (response.status === 304) {
    return { status: "not_modified" };
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthError("Authentication expired. Please reconnect.");
    }

    let errorDetails: ApiErrorResponse | undefined;
    try {
      errorDetails = (await response.json()) as ApiErrorResponse;
    } catch {
      // Response body is not JSON
    }

    const errorMessage =
      errorDetails?.errors?.[0]?.detail ?? errorDetails?.errors?.[0]?.title ?? `API error: ${response.status}`;

    throw new ApiError(errorMessage, response.status, errorDetails);
  }

  const exportResponse = (await response.json()) as BookmarksExportResponse;

  // Parse included resources into separate arrays
  const areas: FavoroArea[] = [];
  const sections: FavoroSection[] = [];
  const links: FavoroLink[] = [];

  for (const resource of exportResponse.included) {
    if (isFavoroArea(resource)) {
      areas.push(resource);
    } else if (isFavoroSection(resource)) {
      sections.push(resource);
    } else if (isFavoroLink(resource)) {
      links.push(resource);
    }
  }

  const cachedData: CachedData = {
    areas,
    sections,
    links,
    exportedAt: exportResponse.data.exported_at,
    etag: exportResponse.meta.etag,
    cacheUntil: exportResponse.meta.cache_until,
  };

  return { status: "ok", data: cachedData };
}
