import { describeEnvironment, fetchSourcesAcross, resolveCatalogEnvironments } from "../catalog_environments";

type Input = {
  /**
   * The search query to filter sources by name, source name, or tags.
   * Leave empty to list all sources.
   */
  query?: string;
  /**
   * The environment ID to search in. If not provided, searches the production environment of every project.
   */
  environmentId?: number;
};

/**
 * Search dbt sources with freshness status
 */
export default async function tool(input: Input) {
  const environments = await resolveCatalogEnvironments(input.environmentId);
  if (environments.length === 0) {
    return { error: "No environments found. Please configure a dbt Cloud environment." };
  }

  const sources = await fetchSourcesAcross(environments);

  if (sources.length === 0) {
    return { sources: [], message: `No sources found in ${environments.length} environment(s).` };
  }

  // Filter by query if provided
  let filteredSources = sources;
  if (input.query) {
    const query = input.query.toLowerCase();
    filteredSources = sources.filter(
      ({ node: source }) =>
        source.name.toLowerCase().includes(query) ||
        source.sourceName?.toLowerCase().includes(query) ||
        source.description?.toLowerCase().includes(query) ||
        source.tags?.some((tag) => tag.toLowerCase().includes(query)),
    );
  }

  // Return simplified source data for AI consumption
  return {
    environmentsSearched: environments.length,
    count: filteredSources.length,
    sources: filteredSources.slice(0, 20).map(({ node: source, environment }) => ({
      name: source.name,
      sourceName: source.sourceName,
      fullName: `${source.sourceName}.${source.name}`,
      uniqueId: source.uniqueId,
      environment: describeEnvironment(environment),
      environmentId: environment.id,
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
