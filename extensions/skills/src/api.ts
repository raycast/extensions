import { API_BASE_URL, type SearchResponse, deduplicateSkills } from "./shared";

export function buildSkillsSearchUrl(query: string, limit = 50) {
  return `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}`;
}

export async function fetchSkillsSearch(query: string, signal?: AbortSignal, limit = 50): Promise<SearchResponse> {
  const res = await fetch(buildSkillsSearchUrl(query, limit), { signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = (await res.json()) as SearchResponse;
  return { ...data, skills: deduplicateSkills(data.skills) };
}
