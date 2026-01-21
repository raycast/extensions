/**
 * Spaces Management
 *
 * Multi-space support for Craft extension.
 * Users can have a default space (via preferences) and additional spaces stored locally.
 */

import { LocalStorage, getPreferenceValues } from "@raycast/api";

// =============================================================================
// Types
// =============================================================================

export interface Space {
  id: string;
  name: string;
  documentsApiUrl: string;
  dailyNotesAndTasksApiUrl: string;
  documentsApiKey?: string;
  dailyNotesAndTasksApiKey?: string;
  isDefault?: boolean;
}

// Preferences are auto-generated in raycast-env.d.ts - no manual interface needed

/** Error response from Craft API when daily note doesn't exist */
interface CraftApiErrorResponse {
  error: string;
  code: string;
  details?: {
    resourceType?: string;
    date?: string;
    spaceId?: string;
  };
}

// =============================================================================
// Storage Keys
// =============================================================================

const STORAGE_KEYS = {
  spaces: "craft-spaces",
  currentSpaceId: "craft-current-space-id",
  defaultSpaceId: "craft-default-space-id",
} as const;

// =============================================================================
// Space ID Fetching
// =============================================================================

/**
 * Fetch the real spaceId from Craft API.
 * Uses a workaround: calling /blocks with date=tomorrow returns a 404 error
 * that includes the spaceId in the error details.
 */
async function fetchSpaceIdFromApi(documentsApiUrl: string, apiKey?: string): Promise<string> {
  const url = `${documentsApiUrl}/blocks?date=2034-03-10&maxDepth=0`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await globalThis.fetch(url, {
    method: "GET",
    headers,
  });

  const responseData = await response.json();

  // We expect a 404 error with spaceId in the response
  if (response.status === 404) {
    const errorData = responseData as CraftApiErrorResponse;
    if (errorData.details?.spaceId) {
      return errorData.details.spaceId;
    }
  }

  // If the request succeeds (daily note exists), try to extract from a successful response
  // or fall back to generating an ID
  if (response.ok) {
    // Try parsing the response to see if we can get spaceId from blocks
    const data = await response.json();
    // Check if any block has spaceId (this is a fallback)
    if (data && typeof data === "object") {
      // The blocks might have spaceId, but if not, we need another approach
      // For now, generate a unique ID as fallback
      console.warn("Daily note exists but could not extract spaceId from response");
    }
  }

  throw new Error("Could not fetch spaceId from Craft API. Please check your API URL configuration.");
}

/**
 * Get or fetch the default space ID.
 * Fetches from API on first call and caches in LocalStorage.
 */
async function getOrFetchDefaultSpaceId(documentsApiUrl: string, apiKey?: string): Promise<string> {
  // Check if we already have the default space ID cached
  const cachedId = await LocalStorage.getItem<string>(STORAGE_KEYS.defaultSpaceId);
  if (cachedId) {
    return cachedId;
  }

  // Fetch from API and cache
  const spaceId = await fetchSpaceIdFromApi(documentsApiUrl, apiKey);
  await LocalStorage.setItem(STORAGE_KEYS.defaultSpaceId, spaceId);
  return spaceId;
}

// =============================================================================
// Space Management
// =============================================================================

/**
 * Get the default space from preferences with real spaceId from API.
 * Returns null if preferences are not configured.
 */
export async function getDefaultSpace(): Promise<Space | null> {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.documentsApiUrl || !preferences.dailyNotesAndTasksApiUrl) {
    return null;
  }

  const spaceId = await getOrFetchDefaultSpaceId(preferences.documentsApiUrl, preferences.documentsApiKey);

  return {
    id: spaceId,
    name: "Default Space",
    documentsApiUrl: preferences.documentsApiUrl,
    dailyNotesAndTasksApiUrl: preferences.dailyNotesAndTasksApiUrl,
    documentsApiKey: preferences.documentsApiKey,
    dailyNotesAndTasksApiKey: preferences.dailyNotesAndTasksApiKey,
    isDefault: true,
  };
}

/**
 * Get all additional spaces from local storage.
 */
export async function getAdditionalSpaces(): Promise<Space[]> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.spaces);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as Space[];
  } catch {
    return [];
  }
}

/**
 * Get all available spaces (default + additional).
 */
export async function getAllSpaces(): Promise<Space[]> {
  const defaultSpace = await getDefaultSpace();
  const additionalSpaces = await getAdditionalSpaces();

  const spaces: Space[] = [];
  if (defaultSpace) {
    spaces.push(defaultSpace);
  }
  spaces.push(...additionalSpaces);

  return spaces;
}

/**
 * Save additional spaces to local storage.
 */
export async function saveAdditionalSpaces(spaces: Space[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.spaces, JSON.stringify(spaces));
}

/**
 * Add a new space.
 * Fetches the real spaceId from the Craft API.
 */
export async function addSpace(space: Omit<Space, "id">): Promise<Space> {
  const spaces = await getAdditionalSpaces();

  // Fetch the real spaceId from Craft API
  const spaceId = await fetchSpaceIdFromApi(space.documentsApiUrl, space.documentsApiKey);

  const newSpace: Space = {
    ...space,
    id: spaceId,
  };
  spaces.push(newSpace);
  await saveAdditionalSpaces(spaces);
  return newSpace;
}

/**
 * Update an existing space.
 */
export async function updateSpace(id: string, updates: Partial<Omit<Space, "id" | "isDefault">>): Promise<void> {
  const spaces = await getAdditionalSpaces();
  const index = spaces.findIndex((s) => s.id === id);
  if (index !== -1) {
    spaces[index] = { ...spaces[index], ...updates };
    await saveAdditionalSpaces(spaces);
  }
}

/**
 * Delete a space by ID.
 */
export async function deleteSpace(id: string): Promise<void> {
  // Check if this is the default space
  const defaultSpace = await getDefaultSpace();
  if (defaultSpace && id === defaultSpace.id) {
    throw new Error("Cannot delete the default space");
  }

  const spaces = await getAdditionalSpaces();
  const filtered = spaces.filter((s) => s.id !== id);
  await saveAdditionalSpaces(filtered);

  // If the deleted space was current, reset to default
  const currentId = await getCurrentSpaceId();
  if (currentId === id && defaultSpace) {
    await setCurrentSpaceId(defaultSpace.id);
  }
}

/**
 * Get the ID of the currently selected space.
 */
export async function getCurrentSpaceId(): Promise<string> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.currentSpaceId);
  if (stored) {
    return stored;
  }

  // Return the default space ID if no current space is set
  const defaultSpace = await getDefaultSpace();
  if (defaultSpace) {
    return defaultSpace.id;
  }

  throw new Error("No spaces configured");
}

/**
 * Set the current space by ID.
 */
export async function setCurrentSpaceId(id: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.currentSpaceId, id);
}

/**
 * Get the currently selected space.
 * Returns the default space if current space is not found or not configured.
 */
export async function getCurrentSpace(): Promise<Space> {
  const currentId = await getCurrentSpaceId();
  const allSpaces = await getAllSpaces();

  // Find the current space
  const currentSpace = allSpaces.find((s) => s.id === currentId);
  if (currentSpace) {
    return currentSpace;
  }

  // Fallback to default space
  const defaultSpace = await getDefaultSpace();
  if (defaultSpace) {
    return defaultSpace;
  }

  // Fallback to first available space
  if (allSpaces.length > 0) {
    await setCurrentSpaceId(allSpaces[0].id);
    return allSpaces[0];
  }

  throw new Error(
    "No spaces configured. Please configure the default space in extension preferences or add a space via Manage Spaces command.",
  );
}

/**
 * Get the Documents API URL for the current space.
 */
export async function getDocumentsApiUrl(): Promise<string> {
  const space = await getCurrentSpace();
  return space.documentsApiUrl;
}

/**
 * Get the Daily Notes & Tasks API URL for the current space.
 */
export async function getDailyNotesAndTasksApiUrl(): Promise<string> {
  const space = await getCurrentSpace();
  return space.dailyNotesAndTasksApiUrl;
}

/**
 * Get the Documents API Key for the current space (if configured).
 */
export async function getDocumentsApiKey(): Promise<string | undefined> {
  const space = await getCurrentSpace();
  return space.documentsApiKey;
}

/**
 * Get the Daily Notes & Tasks API Key for the current space (if configured).
 */
export async function getDailyNotesAndTasksApiKey(): Promise<string | undefined> {
  const space = await getCurrentSpace();
  return space.dailyNotesAndTasksApiKey;
}

// =============================================================================
// React Hook
// =============================================================================

import { usePromise } from "@raycast/utils";

export interface UseCurrentSpaceResult {
  space: Space | undefined;
  isLoading: boolean;
  error?: Error;
  revalidate: () => void;
  /** Documents API base URL for current space (empty string if loading) */
  documentsApiUrl: string;
  /** Daily Notes & Tasks API base URL for current space (empty string if loading) */
  dailyNotesAndTasksApiUrl: string;
  /** Documents API key for current space (undefined if not configured or loading) */
  documentsApiKey: string | undefined;
  /** Daily Notes & Tasks API key for current space (undefined if not configured or loading) */
  dailyNotesAndTasksApiKey: string | undefined;
  /** Headers for Documents API requests (includes Authorization if API key configured) */
  documentsHeaders: HeadersInit;
  /** Headers for Daily Notes API requests (includes Authorization if API key configured) */
  dailyNotesAndTasksHeaders: HeadersInit;
}

/**
 * Build headers object with optional API key authorization.
 */
function buildSpaceHeaders(apiKey?: string): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  return headers;
}

/**
 * React hook to get the current space with its API URLs.
 * Use this in components that need to make API calls with the current space.
 *
 * @example
 * ```tsx
 * const { space, documentsApiUrl, documentsHeaders, isLoading } = useCurrentSpace();
 * // Use documentsApiUrl and documentsHeaders in useFetch
 * ```
 */
export function useCurrentSpace(): UseCurrentSpaceResult {
  const { data, isLoading, error, revalidate } = usePromise(getCurrentSpace);

  const documentsHeaders = buildSpaceHeaders(data?.documentsApiKey);
  const dailyNotesAndTasksHeaders = buildSpaceHeaders(data?.dailyNotesAndTasksApiKey);

  return {
    space: data,
    isLoading,
    error,
    revalidate,
    documentsApiUrl: data?.documentsApiUrl ?? "",
    dailyNotesAndTasksApiUrl: data?.dailyNotesAndTasksApiUrl ?? "",
    documentsApiKey: data?.documentsApiKey,
    dailyNotesAndTasksApiKey: data?.dailyNotesAndTasksApiKey,
    documentsHeaders,
    dailyNotesAndTasksHeaders,
  };
}
