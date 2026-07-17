import { knowledgeGraphManager } from "../knowledge-graph-manager";

/**
 * Create multiple new entities in the knowledge graph.
 */
export default async function (input: {
  /**
   * A list of new entities to create in the knowledge graph.
   */
  entities: {
    /**
     * The unique name of the entity to create.
     */
    name: string;
    /**
     * The type or classification of the entity.
     */
    entityType: string;
    /**
     * Array of initial observations about the entity.
     */
    observations: string[];
  }[];
}) {
  return knowledgeGraphManager.createEntities(input.entities);
}
