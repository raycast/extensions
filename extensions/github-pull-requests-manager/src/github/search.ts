import { PullRequest, SearchResult, GitHubErrorResponse } from "./types/pr";

export async function searchPullRequests(apiUrl: string, token: string, query: string): Promise<PullRequest[]> {
  const encoded = encodeURIComponent(query);
  const headers = { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" };
  const items: PullRequest[] = [];
  let page = 1;
  let totalCount = Infinity;

  do {
    const url = `${apiUrl}/search/issues?q=${encoded}&per_page=100&page=${page}&sort=updated&order=desc`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const json = (await response.json().catch(() => ({}))) as GitHubErrorResponse;
      const detail = json.errors?.map((e) => e.message ?? e.code).join(", ") ?? json.message ?? response.statusText;
      throw new Error(`GitHub ${response.status}: ${detail} (query: ${query})`);
    }

    const data = (await response.json()) as SearchResult;
    totalCount = data.total_count;
    items.push(...data.items);
    page++;
  } while (items.length < totalCount && items.length % 100 === 0);

  return items;
}
