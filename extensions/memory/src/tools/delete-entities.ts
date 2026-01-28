import { knowledgeGraphManager } from "../knowledge-graph-manager";

/**
 * Delete entities from the knowledge graph along with their related relations.
 */
export default async function (input: {
  /**
   * Names of the entities to delete from the graph.
   */
  entityNames: string[];
}) {
  return knowledgeGraphManager.deleteEntities(input.entityNames);
}
