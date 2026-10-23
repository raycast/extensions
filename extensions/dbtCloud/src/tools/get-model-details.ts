import { fetchModelWithLineage } from "../api";
import { describeEnvironment, fetchModelsAcross, resolveCatalogEnvironments } from "../catalog_environments";

type Input = {
  /**
   * The name or unique ID of the model to get details for.
   * Can be just the model name (e.g., "orders") or full uniqueId (e.g., "model.my_project.orders")
   */
  modelName: string;
  /**
   * The environment ID. If not provided, searches the production environment of every project.
   */
  environmentId?: number;
};

/**
 * Get detailed information about a specific dbt model including columns, tests, and lineage
 */
export default async function tool(input: Input) {
  const environments = await resolveCatalogEnvironments(input.environmentId);
  if (environments.length === 0) {
    return { error: "No environments found. Please configure a dbt Cloud environment." };
  }

  const wanted = input.modelName.toLowerCase();
  const matches = (await fetchModelsAcross(environments)).filter(
    ({ node: m }) => m.name.toLowerCase() === wanted || m.uniqueId.toLowerCase() === wanted,
  );
  if (matches.length === 0) {
    return { error: `Model "${input.modelName}" not found in ${environments.length} environment(s).` };
  }
  const { node: match, environment } = matches[0];

  // Fetch full model details with lineage
  const model = await fetchModelWithLineage(environment.id, match.uniqueId);

  if (!model) {
    return { error: `Could not fetch details for model "${input.modelName}".` };
  }

  return {
    name: model.name,
    uniqueId: model.uniqueId,
    environment: describeEnvironment(environment),
    environmentId: environment.id,
    alsoFoundIn: matches.slice(1).map((m) => describeEnvironment(m.environment)),
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
