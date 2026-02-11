import { knowledgeGraphManager } from "../knowledge-graph-manager";

/**
 * Search the knowledge graph by matching a query to entity names, types, or observations.
 */
export default async function (input: {
  /**
   * A query string used to search entity names, types, or observations.
   */
  query: string;
}) {
  return knowledgeGraphManager.searchNodes(input.query);
}
