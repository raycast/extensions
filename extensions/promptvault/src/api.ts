import { getPreferenceValues } from "@raycast/api";
import type {
  Preferences,
  ApiResponse,
  PromptListItem,
  PromptDetail,
  Category,
  TagWithDetails,
  FillResponse,
  CreatePromptInput,
} from "./types";

/**
 * Get extension preferences
 */
export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

/**
 * Build API URL
 */
function buildUrl(path: string): string {
  const { apiUrl } = getPreferences();
  const baseUrl = apiUrl.replace(/\/$/, ""); // Remove trailing slash
  return `${baseUrl}/api/v1${path}`;
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { apiKey } = getPreferences();

  const url = buildUrl(path);
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    switch (response.status) {
      case 401:
        throw new Error(
          "Invalid API key. Please check your API key in extension preferences.",
        );
      case 403:
        throw new Error("Access denied. Verify your API key permissions.");
      case 404:
        throw new Error("Resource not found.");
      case 429:
        throw new Error("Rate limit exceeded. Please wait and try again.");
      default: {
        const errorText = await response.text();
        throw new Error(
          `API error: ${response.status} ${response.statusText}. ${errorText}`,
        );
      }
    }
  }

  const data = (await response.json()) as ApiResponse<T>;

  if (!data.success) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Unknown API error",
    );
  }

  return data.data as T;
}

/**
 * Fetch user's prompts with optional filters
 */
export async function fetchPrompts(filters?: {
  category?: string;
  tag?: string;
  search?: string;
  archived?: boolean;
}): Promise<PromptListItem[]> {
  const params = new URLSearchParams();

  if (filters?.category) params.set("category", filters.category);
  if (filters?.tag) params.set("tag", filters.tag);
  if (filters?.search) params.set("q", filters.search);
  if (filters?.archived !== undefined)
    params.set("archived", String(filters.archived));

  // Fetch all pages
  let allPrompts: PromptListItem[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    params.set("page", String(page));
    params.set("limit", "100");

    const queryString = params.toString();
    const path = `/prompts${queryString ? `?${queryString}` : ""}`;

    const data = await apiRequest<PromptListItem[]>(path);
    allPrompts = [...allPrompts, ...data];

    // Simple pagination check: if we got less than limit, no more pages
    hasMore = data.length >= 100;
    page++;

    // Safety limit
    if (page > 10) break;
  }

  return allPrompts;
}

/**
 * Get prompt detail with content
 */
export async function getPromptDetail(slug: string): Promise<PromptDetail> {
  return apiRequest<PromptDetail>(`/prompts/${encodeURIComponent(slug)}`);
}

/**
 * Fill prompt variables
 */
export async function fillPrompt(
  slug: string,
  variables: Record<string, string>,
): Promise<FillResponse> {
  return apiRequest<FillResponse>(`/prompts/${encodeURIComponent(slug)}/fill`, {
    method: "POST",
    body: JSON.stringify({ variables }),
  });
}

/**
 * AI Fill - Extract variable values from natural language description
 */
export type AiFillMode = "guess_all" | "null_if_unsure";

export type AiFillResponse = {
  promptId: string;
  versionNumber: number;
  variables: Record<string, string | null>;
  confidence: Record<string, number>;
};

export async function aiFillPrompt(
  slug: string,
  description: string,
  mode: AiFillMode = "null_if_unsure",
): Promise<AiFillResponse> {
  return apiRequest<AiFillResponse>(
    `/prompts/${encodeURIComponent(slug)}/ai-fill`,
    {
      method: "POST",
      body: JSON.stringify({ description, mode }),
    },
  );
}

/**
 * Create a new prompt
 */
export async function createPrompt(
  input: CreatePromptInput,
): Promise<{ id: string; slug: string; name: string }> {
  return apiRequest<{ id: string; slug: string; name: string }>("/prompts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Fetch all categories
 */
export async function fetchCategories(): Promise<Category[]> {
  return apiRequest<Category[]>("/categories");
}

/**
 * Fetch all tags (sorted by usage)
 */
export async function fetchTags(): Promise<TagWithDetails[]> {
  return apiRequest<TagWithDetails[]>("/tags?limit=100");
}

/**
 * Search prompts locally (client-side filtering)
 */
export function searchPrompts(
  prompts: PromptListItem[],
  query: string,
): PromptListItem[] {
  if (!query.trim()) return prompts;

  const searchTerm = query.toLowerCase();
  return prompts.filter(
    (prompt) =>
      prompt.name.toLowerCase().includes(searchTerm) ||
      prompt.description?.toLowerCase().includes(searchTerm) ||
      prompt.tags?.some((tag) => tag.name.toLowerCase().includes(searchTerm)),
  );
}

/**
 * Filter prompts by category
 */
export function filterByCategory(
  prompts: PromptListItem[],
  categoryId: string,
): PromptListItem[] {
  if (!categoryId) return prompts;
  return prompts.filter((prompt) => prompt.category?.id === categoryId);
}

/**
 * Get all unique tags from prompts
 */
export function getAllTags(
  prompts: PromptListItem[],
): Array<{ name: string; slug: string }> {
  const tagsMap = new Map<string, { name: string; slug: string }>();

  prompts.forEach((prompt) => {
    prompt.tags?.forEach((tag) => {
      if (!tagsMap.has(tag.slug)) {
        tagsMap.set(tag.slug, tag);
      }
    });
  });

  return Array.from(tagsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
