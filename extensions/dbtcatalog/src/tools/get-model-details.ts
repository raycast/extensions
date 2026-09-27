import { fetchModelWithLineage, fetchModels } from "../api";
import { fetchFromApi, buildApiUrl } from "../api";

type Input = {
  /**
   * The name or unique ID of the model to get details for.
   * Can be just the model name (e.g., "orders") or full uniqueId (e.g., "model.my_project.orders")
   */
  modelName: string;
  /**
   * The environment ID. If not provided, will use the first production environment.
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
 * Get detailed information about a specific dbt model including columns, tests, and lineage
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

  // First, find the model by name if not a full uniqueId
  let uniqueId = input.modelName;
  if (!uniqueId.startsWith("model.")) {
    const models = await fetchModels(environmentId);
    const matchingModel = models.find(
      (m) => m.name.toLowerCase() === input.modelName.toLowerCase() || m.uniqueId === input.modelName
    );
    if (!matchingModel) {
      return { error: `Model "${input.modelName}" not found.` };
    }
    uniqueId = matchingModel.uniqueId;
  }

  // Fetch full model details with lineage
  const model = await fetchModelWithLineage(environmentId, uniqueId);

  if (!model) {
    return { error: `Could not fetch details for model "${input.modelName}".` };
  }

  return {
    name: model.name,
    uniqueId: model.uniqueId,
    description: model.description || null,
    database: model.database,
    schema: model.schema,
    alias: model.alias,
    materialization: model.materializedType,
    access: model.access,
    group: model.group,
    tags: model.tags || [],
    language: model.language || "sql",
    contractEnforced: model.contractEnforced,
    columns:
      model.catalog?.columns?.map((col) => ({
        name: col.name,
        type: col.type,
        description: col.description || null,
      })) || [],
    tests:
      model.tests?.map((test) => ({
        name: test.name,
        column: test.columnName || null,
      })) || [],
    upstream:
      model.ancestors?.map((a) => ({
        name: a.sourceName ? `${a.sourceName}.${a.name}` : a.name,
        type: a.resourceType,
      })) || [],
    downstream:
      model.children?.map((c) => ({
        name: c.name,
        type: c.resourceType,
      })) || [],
    rawCode: model.rawCode || null,
    compiledCode: model.compiledCode || null,
  };
}
