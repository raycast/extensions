import { fetchModels, fetchFromApi, buildApiUrl } from "../api";

type Input = {
  /**
   * The search query to find models by name, description, or tags.
   * Leave empty to list all models.
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
 * Search dbt models by name, description, or tags in the catalog
 */
export default async function tool(input: Input) {
  let environmentId = input.environmentId;
  let environmentName = "Unknown";

  // If no environment ID provided, fetch the first production environment
  if (!environmentId) {
    const environments = await fetchFromApi<Environment>(buildApiUrl("/environments/"));
    const prodEnv = environments.find((e) => e.type === "deployment") || environments[0];
    if (!prodEnv) {
      return { error: "No environments found. Please configure a dbt Cloud environment." };
    }
    environmentId = prodEnv.id;
    environmentName = prodEnv.name;
  }

  const models = await fetchModels(environmentId);

  if (!models || models.length === 0) {
    return { models: [], message: "No models found in this environment." };
  }

  // Filter by query if provided
  let filteredModels = models;
  if (input.query) {
    const query = input.query.toLowerCase();
    filteredModels = models.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.tags?.some((t) => t.toLowerCase().includes(query))
    );
  }

  return {
    environmentName,
    count: filteredModels.length,
    models: filteredModels.slice(0, 20).map((m) => ({
      name: m.name,
      uniqueId: m.uniqueId,
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
