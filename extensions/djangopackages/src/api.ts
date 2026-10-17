import {
  ApiPackageDetail,
  PaginatedResponse,
  CategorySummary,
  GridSummary,
  SearchResponseItem,
} from "./types";

const API_BASE_URL = "https://djangopackages.org/api/v4";
const JSON_HEADERS = { Accept: "application/json" } as const;

async function request<T>(
  pathname: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(pathname.startsWith("http") ? pathname : `${API_BASE_URL}${pathname}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: JSON_HEADERS,
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status >= 500) {
      throw new Error("Server error. Please try again later.");
    }
    throw new Error(`Request failed (${response.status}): ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function fetchCategories(): Promise<CategorySummary[]> {
  const data = await request<PaginatedResponse<CategorySummary>>("/categories/", {
    limit: 200,
  });
  return data.results;
}

export async function searchPackages(query: string): Promise<SearchResponseItem[]> {
  if (!query.trim()) {
    return [];
  }

  return await request<SearchResponseItem[]>("/search/", { q: query.trim() });
}

export async function fetchPackageDetail(slug: string): Promise<ApiPackageDetail> {
  return await request<ApiPackageDetail>(`/packages/${slug}/`);
}

export async function fetchCategoryByUrl(url: string): Promise<CategorySummary> {
  return await request<CategorySummary>(url);
}

export async function fetchGridByUrl(url: string): Promise<GridSummary> {
  return await request<GridSummary>(url);
}
