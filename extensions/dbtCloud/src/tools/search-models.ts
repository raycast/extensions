import { describeEnvironment, fetchModelsAcross, resolveCatalogEnvironments } from "../catalog_environments";

type Input = {
  /**
   * The search query to find models by name, description, or tags.
   * Leave empty to list all models.
   */
  query?: string;
  /**
   * The environment ID to search in. If not provided, searches the production environment of every project.
   */
  environmentId?: number;
};

/**
 * Search dbt models by name, description, or tags in the catalog
 */
export default async function tool(input: Input) {
  const environments = await resolveCatalogEnvironments(input.environmentId);
  if (environments.length === 0) {
    return { error: "No environments found. Please configure a dbt Cloud environment." };
  }

  const models = await fetchModelsAcross(environments);

  if (models.length === 0) {
    return { models: [], message: `No models found in ${environments.length} environment(s).` };
  }

  // Filter by query if provided
  let filteredModels = models;
  if (input.query) {
    const query = input.query.toLowerCase();
    filteredModels = models.filter(
      ({ node: m }) =>
        m.name.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.tags?.some((t) => t.toLowerCase().includes(query)),
    );
  }

  return {
    environmentsSearched: environments.length,
    count: filteredModels.length,
    models: filteredModels.slice(0, 20).map(({ node: m, environment }) => ({
      name: m.name,
      uniqueId: m.uniqueId,
      environment: describeEnvironment(environment),
      environmentId: environment.id,
      description: m.description || null,
      database: m.database,
      schema: m.schema,
      materialization: m.materializedType,
      access: m.access,
      tags: m.tags || [],
      columnCount: m.catalog?.columns?.length || 0,
    })),
  };
}
