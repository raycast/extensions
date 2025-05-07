import { knowledgeGraphManager } from "../knowledge-graph-manager";

/**
 * Delete specific observations from existing entities.
 */
export default async function (input: {
  /**
   * A list of deletions describing which observations to remove.
   */
  deletions: {
    /**
     * The name of the entity from which observations will be removed.
     */
    entityName: string;
    /**
     * The observations to delete from the entity.
     */
    observations: string[];
  }[];
}) {
  return knowledgeGraphManager.deleteObservations(input.deletions);
}
