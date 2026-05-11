import { ArenaLeaderboardResponse, Category, CategoryLeaderboardResponse, ModelInfo, ModelListItem } from "../types";

const BASE_URL = "https://api.zeroeval.com";

export class ZeroEvalAPI {
  /**
   * Fetches data from the API with error handling
   */
  private async fetch<T>(endpoint: string): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Resource not found");
      }
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      throw new Error(`Failed to fetch: ${response.statusText} (${response.status})`);
    }

    return response.json();
  }

  /**
   * Gets the leaderboard for a specific arena
   * @param arenaId - The arena ID (e.g., "chat-arena", "text-to-svg")
   * @param limit - Maximum number of results to return (default: 10)
   * @param offset - Number of results to skip (default: 0)
   */
  async getArenaLeaderboard(
    arenaId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<ArenaLeaderboardResponse> {
    let endpoint: string;
    if (arenaId === "stock-arena") {
      endpoint = `/stock-arena/leaderboard?limit=${limit}&offset=${offset}`;
    } else {
      endpoint = `/magia/arenas/${arenaId}/leaderboard?limit=${limit}&offset=${offset}`;
    }
    return this.fetch<ArenaLeaderboardResponse>(endpoint);
  }

  /**
   * Gets the list of all categories
   */
  async getCategories(): Promise<Category[]> {
    const endpoint = "/leaderboard/categories";
    return this.fetch<Category[]>(endpoint);
  }

  /**
   * Gets benchmarks for a specific category
   * @param categoryId - The category ID
   * @param topN - Number of top models to return per benchmark (default: 15)
   */
  async getCategoryBenchmarks(categoryId: string, topN: number = 15): Promise<CategoryLeaderboardResponse> {
    const endpoint = `/leaderboard/categories/${categoryId}/benchmarks?top_n=${topN}`;
    return this.fetch<CategoryLeaderboardResponse>(endpoint);
  }

  /**
   * Gets detailed information about a specific model
   * @param modelId - The model ID
   */
  async getModelInfo(modelId: string): Promise<ModelInfo> {
    const endpoint = `/leaderboard/models/${modelId}`;
    return this.fetch<ModelInfo>(endpoint);
  }

  /**
   * Gets the list of all models
   * @param justCanonicals - Return only canonical models (default: true)
   * @param includeBenchmarks - Include benchmark data (default: true)
   */
  async getModels(justCanonicals: boolean = true, includeBenchmarks: boolean = true): Promise<ModelListItem[]> {
    const endpoint = `/leaderboard/models/full?justCanonicals=${justCanonicals}&include_benchmarks=${includeBenchmarks}`;
    return this.fetch<ModelListItem[]>(endpoint);
  }
}
