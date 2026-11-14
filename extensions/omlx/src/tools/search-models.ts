import { searchHfModels } from "../lib/omlx";

type Input = {
  /** Search query for finding models on HuggingFace (e.g. "qwen vision 4bit", "llama 8b"). */
  query: string;
  /** Maximum number of results to return. Defaults to 10. */
  limit?: number;
};

export default async function (input: Input) {
  const results = await searchHfModels(input.query, input.limit ?? 10);
  return results.map((m) => ({
    repoId: m.repo_id,
    name: m.name,
    size: m.size_formatted,
    params: m.params_formatted,
    downloads: m.downloads,
    likes: m.likes,
  }));
}
