import { getAuthToken, getServerUrl } from "../lib/auth";

/** Natural-language RAG answer over stored documents (see Input fields for options). */
const MIN_QUERY_LENGTH = 3;

type Input = {
  /**
   * Natural language question (JSON key must be `query`). Min. 3 characters after trim.
   * Example: "What methods are used for bump mapping?"
   */
  query: string;

  /**
   * Search mode. Example: "mix" (default).
   * "mix": knowledge graph + vector (recommended); "hybrid": local+global; "local": entities/edges;
   * "global": broad patterns; "naive": vector only; "bypass": no retrieval.
   */
  mode?: "mix" | "local" | "global" | "hybrid" | "naive" | "bypass";

  /** Include source references in the answer. Default true. Example: true */
  include_references?: boolean;

  /**
   * Answer layout. Examples: "Multiple Paragraphs", "Single Paragraph", "Bullet Points".
   */
  response_type?: string;

  /** How many top items to retrieve. Example: 10 */
  top_k?: number;
};

export default async function queryLightRAG(input: Input): Promise<string> {
  const serverUrl = getServerUrl();

  const q = (input.query ?? "").trim();
  if (q.length < MIN_QUERY_LENGTH) {
    return `Error: "query" is required and must be at least ${MIN_QUERY_LENGTH} characters after trimming (LightRAG API). Example: "What is neural rendering?"`;
  }

  let token: string;
  try {
    token = await getAuthToken();
  } catch (error) {
    return `Authentication error: ${error instanceof Error ? error.message : String(error)}`;
  }

  const requestBody: Record<string, unknown> = {
    query: q,
    mode: input.mode || "mix",
    stream: false,
    include_references: input.include_references !== false,
  };

  if (input.response_type) {
    requestBody.response_type = input.response_type;
  }
  if (input.top_k != null) {
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
      return `Connection error: Could not reach LightRAG at ${serverUrl}. Make sure the server is running and the URL is correct.`;
    }
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
