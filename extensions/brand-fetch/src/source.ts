import { RetrieveBrandResponse, SearchBrandKeyword } from "./source.types";

export async function retrieveBrand(key: string, domain: string): Promise<RetrieveBrandResponse> {
  const response = await fetch(`https://api.brandfetch.io/v2/brands/${encodeURIComponent(domain)}`, {
    headers: {
      Authorization: `Bearer ${key}`,
    },
    signal: AbortSignal.timeout(30 * 1000),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
    throw new Error(errorData?.message || `BrandFetch request failed (${response.status})`);
  }

  return (await response.json()) as RetrieveBrandResponse;
}

export async function searchBrandKeyword(key: string): Promise<SearchBrandKeyword[]> {
  const response = await fetch(`https://api.brandfetch.io/v2/search/${encodeURIComponent(key)}`);
  if (!response.ok) {
    throw new Error(`BrandFetch search failed (${response.status})`);
  }
  const data = (await response.json()) as SearchBrandKeyword[];

  if (data.length == 0) {
    throw new Error(`no results found`);
  }

  return data;
}
