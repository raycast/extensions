import { getAuthToken, getServerUrl } from "../lib/auth";

/**
 * Search the LightRAG knowledge base using a natural language query.
 * Returns relevant passages from stored documents, papers, and knowledge.
 * The knowledge base contains scientific papers managed via Zotero.
 *
 * @param input.query - The natural language search query. Must be at least
 *   3 characters long. Example: "What methods are used for bump mapping?"
 *
 * @param input.mode - The search mode to use:
 *   - "mix" (default, RECOMMENDED): Integrates knowledge graph + vector search
 *   - "hybrid": Combines local and global knowledge graph strategies
 *   - "local": Focuses on specific entities and direct relationships
 *   - "global": Analyzes broader patterns across the knowledge graph
 *   - "naive": Simple vector similarity search without knowledge graph
 *   - "bypass": Direct LLM query without knowledge retrieval
 *
 * @param input.include_references - Whether to include source document
 *   references in the response. Defaults to true.
 *
 * @param input.response_type - Desired response format. Examples:
 *   "Multiple Paragraphs", "Single Paragraph", "Bullet Points".
 *
 * @param input.top_k - Number of top items to retrieve. Higher = more context.
 */
type Input = {
  /** The search query, minimum 3 characters */
  query: string;

  /**
   * Search mode. "mix" is recommended for best results.
   * "local" for entity details, "global" for broad patterns,
   * "hybrid" for combined, "naive" for keyword search,
   * "bypass" for direct LLM without retrieval.
   */
  mode?: "mix" | "local" | "global" | "hybrid" | "naive" | "bypass";

  /** Include source document references. Defaults to true. */
  include_references?: boolean;

  /**
   * Response format preference.
   * Examples: "Multiple Paragraphs", "Single Paragraph", "Bullet Points"
   */
  response_type?: string;

  /** Number of top items to retrieve. Higher = more context. */
  top_k?: number;
};

export default async function queryLightRAG(input: Input): Promise<string> {
  const serverUrl = getServerUrl();

  let token: string;
  try {
    token = await getAuthToken();
  } catch (error) {
    return `Authentication error: ${error instanceof Error ? error.message : String(error)}`;
  }

  const requestBody: Record<string, unknown> = {
    query: input.query,
    mode: input.mode || "mix",
    stream: false,
    include_references: input.include_references !== false,
  };

  if (input.response_type) {
    requestBody.response_type = input.response_type;
  }
  if (input.top_k) {
    requestBody.top_k = input.top_k;
  }

  try {
    const response = await fetch(`${serverUrl}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `Error querying LightRAG (HTTP ${response.status}): ${errorText}`;
    }

    const data = (await response.json()) as {
      response?: string;
      references?: Array<{ id?: string; file_path?: string; source_id?: string }>;
    };

    let result = "";

    if (data.response) {
      result += data.response;
    }

    if (data.references && data.references.length > 0) {
      result += "\n\n---\n**References:**\n";
      data.references.forEach((ref, index) => {
        const source = ref.file_path || ref.source_id || ref.id || `Source ${index + 1}`;
        result += `- ${source}\n`;
      });
    }

    return result || "No results found for this query.";
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return `Connection error: Could not reach LightRAG at ${serverUrl}. Make sure your Wireguard VPN is active.`;
    }
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
