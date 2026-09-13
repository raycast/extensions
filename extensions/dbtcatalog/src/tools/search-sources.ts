import { fetchSources } from "../api";
import { fetchFromApi, buildApiUrl } from "../api";

type Input = {
  /**
   * The search query to filter sources by name, source name, or tags.
   * Leave empty to list all sources.
   */
  query?: string;
  /**
   * The environment ID to search in. If not provided, will search the first production environment.
   */
  environmentId?: number;
};

interface Environment {
  id: number;
  name: string;
  type: string;
  dbt_project_id: number;
  project_id: number;
}

/**
 * Search dbt sources with freshness status
 */
export default async function tool(input: Input) {
  let environmentId = input.environmentId;

  // If no environment ID provided, fetch the first production environment
  if (!environmentId) {
    const environments = await fetchFromApi<Environment>(buildApiUrl("/environments/"));
    const prodEnv = environments.find((e) => e.type === "deployment") || environments[0];
    if (!prodEnv) {
      return { error: "No environments found. Please configure a dbt Cloud environment." };
    }
    environmentId = prodEnv.id;
  }

  const sources = await fetchSources(environmentId);

  if (!sources || sources.length === 0) {
    return { sources: [], message: "No sources found in this environment." };
  }

  // Filter by query if provided
  let filteredSources = sources;
  if (input.query) {
    const query = input.query.toLowerCase();
    filteredSources = sources.filter(
      (source) =>
        source.name.toLowerCase().includes(query) ||
        source.sourceName?.toLowerCase().includes(query) ||
        source.description?.toLowerCase().includes(query) ||
        source.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  // Return simplified source data for AI consumption
  return {
    count: filteredSources.length,
    sources: filteredSources.slice(0, 20).map((source) => ({
      name: source.name,
      sourceName: source.sourceName,
      fullName: `${source.sourceName}.${source.name}`,
      uniqueId: source.uniqueId,
      description: source.description || null,
      database: source.database,
      schema: source.schema,
      identifier: source.identifier,
      loader: source.loader,
      freshnessStatus: source.freshness?.freshnessStatus || null,
      maxLoadedAt: source.freshness?.maxLoadedAt || null,
      tags: source.tags || [],
      downstreamCount: source.children?.length || 0,
    })),
  };
}
