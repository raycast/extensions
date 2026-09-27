import { fetchRecommendedModels } from "../lib/omlx";

export default async function () {
  const { trending, popular } = await fetchRecommendedModels();

  return {
    trending: trending.map((m) => ({
      repoId: m.repo_id,
      name: m.name,
      size: m.size_formatted,
      params: m.params_formatted,
      downloads: m.downloads,
      likes: m.likes,
    })),
    popular: popular.map((m) => ({
      repoId: m.repo_id,
      name: m.name,
      size: m.size_formatted,
      params: m.params_formatted,
      downloads: m.downloads,
      likes: m.likes,
    })),
  };
}
