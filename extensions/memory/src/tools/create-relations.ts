import { knowledgeGraphManager } from "../knowledge-graph-manager";

/**
 * Create relations between existing entities in the knowledge graph.
 */
export default async function (input: {
  /**
   * A list of new relations to create between entities.
   */
  relations: {
    /**
     * The source entity name.
     */
    from: string;
    /**
     * The target entity name.
     */
    to: string;
    /**
     * The relationship type (in active voice).
     */
    relationType: string;
  }[];
}) {
  // Your tool code here
  return knowledgeGraphManager.createRelations(input.relations);
}
