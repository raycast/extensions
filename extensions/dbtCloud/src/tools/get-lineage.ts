import { fetchModelWithLineage } from "../api";
import {
  describeEnvironment,
  fetchModelsAcross,
  fetchSourcesAcross,
  resolveCatalogEnvironments,
} from "../catalog_environments";

type Input = {
  /**
   * The name or unique ID of the model or source to get lineage for.
   * For sources, use format "source_name.table_name" or the full uniqueId.
   */
  resourceName: string;
  /**
   * The environment ID. If not provided, searches the production environment of every project.
   */
  environmentId?: number;
};

/**
 * Get upstream and downstream lineage for a model or source
 */
export default async function tool(input: Input) {
  const environments = await resolveCatalogEnvironments(input.environmentId);
  if (environments.length === 0) {
    return { error: "No environments found. Please configure a dbt Cloud environment." };
  }

  // Determine if this is a source or model
  const resourceName = input.resourceName.toLowerCase();
  // "source.<pkg>.<name>.<table>" or bare "source_name.table_name"; model uniqueIds start with "model."
  const isSource =
    resourceName.startsWith("source.") || (!resourceName.startsWith("model.") && resourceName.split(".").length === 2);

  if (isSource) {
    // Full uniqueId ("source.<pkg>.<name>.<table>") or "source_name.table_name"
    const sources = await fetchSourcesAcross(environments);
    const [sourceName, tableName] = resourceName.split(".");
    const sourceMatch = sources.find(({ node: s }) =>
      resourceName.startsWith("source.")
        ? s.uniqueId.toLowerCase() === resourceName
        : s.sourceName?.toLowerCase() === sourceName && s.name.toLowerCase() === tableName,
    );

    if (sourceMatch) {
      const matchingSource = sourceMatch.node;
      return {
        environment: describeEnvironment(sourceMatch.environment),
        environmentId: sourceMatch.environment.id,
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
  const models = await fetchModelsAcross(environments);
  const modelMatch = models.find(
    ({ node: m }) => m.name.toLowerCase() === resourceName || m.uniqueId.toLowerCase() === resourceName,
  );

  if (!modelMatch) {
    return { error: `Resource "${input.resourceName}" not found in ${environments.length} environment(s).` };
  }

  // Fetch full model with lineage
  const modelWithLineage = await fetchModelWithLineage(modelMatch.environment.id, modelMatch.node.uniqueId);

  if (!modelWithLineage) {
    return { error: `Could not fetch lineage for "${input.resourceName}".` };
  }

  return {
    environment: describeEnvironment(modelMatch.environment),
    environmentId: modelMatch.environment.id,
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
