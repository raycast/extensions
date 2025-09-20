import { knowledgeGraphManager } from "../knowledge-graph-manager";

/**
 * Delete multiple relations from the knowledge graph.
 */
export default async function (input: {
  /**
   * A list of relations to delete from the knowledge graph.
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
  return knowledgeGraphManager.deleteRelations(input.relations);
}
