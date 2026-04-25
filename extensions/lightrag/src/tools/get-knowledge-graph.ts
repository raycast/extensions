import { getAuthToken, getServerUrl } from "../lib/auth";
import {
  DEFAULT_SUBGRAPH_MAX_DEPTH,
  DEFAULT_SUBGRAPH_MAX_NODES,
  MAX_GRAPH_OUTPUT_CHARS,
  sanitizeGraphResponse,
  serializeGraphForRaycast,
} from "../lib/sanitize-graph-response";

type Input = {
  /**
   * Exact starting entity label (JSON key `label`, same as "Check Entity Exists").
   * Example: "Neural Rendering". If unsure of spelling, use "Search Graph Labels" with `query` first.
   */
  label: string;
  /** Max hops from the start node. Example: 3 (default). */
  max_depth?: number;
  /** Cap on nodes returned. Example: 64 (default, keeps output small). */
  max_nodes?: number;
  /**
   * If true, return untruncated property strings (may exceed Raycast message limits).
   * Default false.
   */
  full_properties?: boolean;
};

/**
 * Connected subgraph around a label (neighborhood exploration).
 */
export default async function getKnowledgeGraph(input: Input): Promise<string> {
  const serverUrl = getServerUrl();
  const label = input.label?.trim() ?? "";
  if (!label) {
    return 'Error: "label" is required (exact graph entity string). Use "Search Graph Labels" with the "query" parameter if the spelling is unknown.';
  }

  let token: string;
  try {
    token = await getAuthToken();
  } catch (error) {
    return `Authentication error: ${error instanceof Error ? error.message : String(error)}`;
  }

  const maxDepth = input.max_depth ?? DEFAULT_SUBGRAPH_MAX_DEPTH;
  const maxNodes = input.max_nodes ?? DEFAULT_SUBGRAPH_MAX_NODES;
  const fullProps = input.full_properties === true;

  const url = new URL(`${serverUrl}/graphs`);
  url.searchParams.set("label", label);
  url.searchParams.set("max_depth", String(maxDepth));
  url.searchParams.set("max_nodes", String(maxNodes));

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `Error fetching knowledge graph (HTTP ${response.status}): ${errorText}`;
    }

    const data = (await response.json()) as unknown;
    const prepared = fullProps ? data : sanitizeGraphResponse(data, false);
    return serializeGraphForRaycast(prepared, MAX_GRAPH_OUTPUT_CHARS);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return `Connection error: Could not reach LightRAG at ${serverUrl}.`;
    }
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
