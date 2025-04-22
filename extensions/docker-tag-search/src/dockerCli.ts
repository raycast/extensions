export interface DockerImage {
  name: string;
  description: string;
  stars: number;
}

export async function searchImages(query: string): Promise<DockerImage[]> {
  if (!query) return [];
  const url = `https://hub.docker.com/v2/search/repositories/?is_official=true&page_size=25&query=${encodeURIComponent(
    query
  )}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Hub search failed (${res.status})`);
  const data = (await res.json()) as {
    results: { repo_name: string; short_description?: string; star_count?: number }[];
  };

  return data.results.map((r) => ({
    name: r.repo_name.replace("library/", ""),
    description: r.short_description ?? "",
    stars: r.star_count ?? 0,
  }));
}
