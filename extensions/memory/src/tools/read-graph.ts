import { knowledgeGraphManager } from "../knowledge-graph-manager";

/**
 * Read the entire knowledge graph and return it.
 */
export default async function () {
  return knowledgeGraphManager.readGraph();
}
