import { fetchModelWithLineage, fetchModels, fetchSources } from "../api";
import { fetchFromApi, buildApiUrl } from "../api";

type Input = {
  /**
   * The name or unique ID of the model or source to get lineage for.
   * For sources, use format "source_name.table_name" or the full uniqueId.
   */
  resourceName: string;
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
 * Get upstream and downstream lineage for a model or source
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

  // Determine if this is a source or model
  const resourceName = input.resourceName.toLowerCase();
  // "source.<pkg>.<name>.<table>" or bare "source_name.table_name"; model uniqueIds start with "model."
  const isSource =
    resourceName.startsWith("source.") || (!resourceName.startsWith("model.") && resourceName.split(".").length === 2);

  if (isSource && !resourceName.startsWith("source.")) {
    // This might be a source in "source_name.table_name" format
    const sources = await fetchSources(environmentId);
    const [sourceName, tableName] = resourceName.split(".");
    const matchingSource = sources.find(
      (s) => s.sourceName?.toLowerCase() === sourceName && s.name.toLowerCase() === tableName
    );

    if (matchingSource) {
      return {
        resource: {
          name: `${matchingSource.sourceName}.${matchingSource.name}`,
          uniqueId: matchingSource.uniqueId,
          type: "source",
          database: matchingSource.database,
          schema: matchingSource.schema,
        },
        upstream: [], // Sources don't have upstream dependencies
        downstream:
          matchingSource.children?.map((c) => ({
            name: c.name,
            type: c.resourceType,
            uniqueId: c.uniqueId,
          })) || [],
      };
    }
  }

  // Try to find as a model
  const models = await fetchModels(environmentId);
  const matchingModel = models.find(
    (m) => m.name.toLowerCase() === resourceName || m.uniqueId.toLowerCase() === resourceName
  );

  if (!matchingModel) {
    return { error: `Resource "${input.resourceName}" not found.` };
  }

  // Fetch full model with lineage
  const modelWithLineage = await fetchModelWithLineage(environmentId, matchingModel.uniqueId);

  if (!modelWithLineage) {
    return { error: `Could not fetch lineage for "${input.resourceName}".` };
  }

  return {
    resource: {
      name: modelWithLineage.name,
      uniqueId: modelWithLineage.uniqueId,
      type: "model",
      database: modelWithLineage.database,
      schema: modelWithLineage.schema,
      materialization: modelWithLineage.materializedType,
    },
    upstream:
      modelWithLineage.ancestors?.map((a) => ({
        name: a.sourceName ? `${a.sourceName}.${a.name}` : a.name,
        type: a.resourceType,
        uniqueId: a.uniqueId,
      })) || [],
    downstream:
      modelWithLineage.children?.map((c) => ({
        name: c.name,
        type: c.resourceType,
        uniqueId: c.uniqueId,
      })) || [],
  };
}
