import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://www.app.neuronapp.tech";

interface ClipResponse {
  success: boolean;
  error?: string;
  noteId?: string;
}

interface SearchResponse {
  success: boolean;
  error?: string;
  results?: SearchResult[];
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: string;
  tags?: string[];
  coverImage?: string;
  favicon?: string;
  organizationSlug: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SearchSort =
  | "updatedAt_desc"
  | "updatedAt_asc"
  | "createdAt_desc"
  | "createdAt_asc"
  | "title_asc"
  | "title_desc";

export interface SearchNotesParams {
  q?: string;
  type?: string;
  tags?: string[];
  sort?: SearchSort;
}

export function buildSearchUrl(params: SearchNotesParams): string {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.type && params.type !== "all")
    searchParams.set("type", params.type);
  if (params.tags?.length) searchParams.set("tags", params.tags.join(","));
  if (params.sort) searchParams.set("sort", params.sort);
  const query = searchParams.toString();
  return `${API_URL}/api/clip/raycast/search${query ? `?${query}` : ""}`;
}

export async function createClip(data: {
  title: string;
  content?: string;
  url?: string;
  tags?: string[];
}) {
  const preferences = getPreferenceValues<Preferences>();
  const { apiKey } = preferences;

  try {
    const response = await fetch(`${API_URL}/api/clip/raycast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(data),
    });

    const result = (await response.json()) as ClipResponse;

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to create clip");
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred");
  }
}

interface TagsResponse {
  success: boolean;
  error?: string;
  tags?: string[];
}

interface CreateTagResponse {
  success: boolean;
  error?: string;
  tag?: string;
}

export async function getTags(): Promise<string[]> {
  const preferences = getPreferenceValues<Preferences>();
  const { apiKey } = preferences;

  const response = await fetch(`${API_URL}/api/clip/raycast/tags`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
  });

  const result = (await response.json()) as TagsResponse;
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to load tags");
  }
  return result.tags ?? [];
}

export async function createTag(name: string): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();
  const { apiKey } = preferences;

  const normalized = name.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Tag name cannot be empty");
  }

  const response = await fetch(`${API_URL}/api/clip/raycast/tags`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ name: normalized }),
  });

  const result = (await response.json()) as CreateTagResponse;
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to create tag");
  }
  return result.tag ?? normalized;
}

export async function searchNotes(
  params: string | SearchNotesParams,
): Promise<SearchResult[]> {
  const preferences = getPreferenceValues<Preferences>();
  const { apiKey } = preferences;
  const searchParams =
    typeof params === "string"
      ? { q: params }
      : {
          q: params.q,
          type: params.type,
          tags: params.tags,
          sort: params.sort,
        };

  try {
    const url = buildSearchUrl(searchParams);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    const result = (await response.json()) as SearchResponse;

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to search notes");
    }

    return result.results || [];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred");
  }
}

// --- Folders ---
export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  organizationSlug: string;
  noteCount: number;
  subfolderCount: number;
}

interface FoldersResponse {
  success: boolean;
  error?: string;
  folders?: FolderItem[];
}

export async function getFolders(): Promise<FolderItem[]> {
  const preferences = getPreferenceValues<Preferences>();
  const { apiKey } = preferences;
  const response = await fetch(`${API_URL}/api/clip/raycast/folders`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
  });
  const result = (await response.json()) as FoldersResponse;
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to load folders");
  }
  return result.folders ?? [];
}

// --- Content search (unified: notes, folders, tags) ---
export interface ContentSearchNote {
  id: string;
  title: string;
  description: string;
  type: string;
  tags: string[];
  updatedAt: string;
  favicon?: string;
  organizationSlug: string;
  /** Plain-text preview of note body (from BlockNote or legacy content), truncated. */
  contentPreview?: string;
}

export interface ContentSearchFolder {
  id: string;
  name: string;
  updatedAt: string;
  noteCount: number;
  subfolderCount: number;
  organizationSlug: string;
}

export interface ContentSearchTag {
  id: string;
  name: string;
  updatedAt: string;
  noteCount: number;
  organizationSlug: string;
}

interface ContentSearchResponse {
  success: boolean;
  error?: string;
  notes?: ContentSearchNote[];
  folders?: ContentSearchFolder[];
  tags?: ContentSearchTag[];
}

export async function searchContent(q?: string): Promise<{
  notes: ContentSearchNote[];
  folders: ContentSearchFolder[];
  tags: ContentSearchTag[];
}> {
  const preferences = getPreferenceValues<Preferences>();
  const { apiKey } = preferences;
  const url = `${API_URL}/api/clip/raycast/search/content${q ? `?q=${encodeURIComponent(q)}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
  });
  const result = (await response.json()) as ContentSearchResponse;
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to search content");
  }
  return {
    notes: result.notes ?? [],
    folders: result.folders ?? [],
    tags: result.tags ?? [],
  };
}
