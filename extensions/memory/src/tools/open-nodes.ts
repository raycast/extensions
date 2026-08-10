import { knowledgeGraphManager } from "../knowledge-graph-manager";

/**
 * Open specific entities in the knowledge graph by their names.
 */
export default async function (input: {
  /**
   * The list of entity names to open.
   */
  names: string[];
}) {
  return knowledgeGraphManager.openNodes(input.names);
}
