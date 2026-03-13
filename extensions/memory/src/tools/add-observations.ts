import { knowledgeGraphManager } from "../knowledge-graph-manager";

/**
 * Add new observations to existing entities in the knowledge graph.
 */
export default async function (input: {
  /**
   * A list of observations to add to existing entities.
   */
  observations: {
    /**
     * The name of the entity to which observations will be added.
     */
    entityName: string;
    /**
     * The new observations to add.
     */
    contents: string[];
  }[];
}) {
  return knowledgeGraphManager.addObservations(input.observations);
}
