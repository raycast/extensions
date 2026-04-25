import { getAuthToken, getServerUrl } from "../lib/auth";

/**
 * Structured retrieval without LLM answer: entities, relationships, chunks, references.
 * Use when the user needs raw evidence, graph-linked context, or analysis — not a prose summary.
 */
const MIN_QUERY_LENGTH = 3;

type Input = {
  /**
   * Natural language retrieval query (JSON key must be `query`). Min. 3 characters after trim.
   * Example: "papers about neural rendering"
   */
  query: string;

  /**
   * Retrieval mode. Example: "mix". Same options as "Query LightRAG (Answer)".
   */
  mode?: "mix" | "local" | "global" | "hybrid" | "naive" | "bypass";

  /** Include reference metadata. Default true. */
  include_references?: boolean;

  /** Optional response shape hint. Examples: "Multiple Paragraphs", "Bullet Points". */
  response_type?: string;

  /** Top-k for retrieval. Example: 10 */
  top_k?: number;

  /** Extra chunk retrieval depth when supported by the server. Example: 5 */
  chunk_top_k?: number;
};

export default async function queryLightRAGData(input: Input): Promise<string> {
  const serverUrl = getServerUrl();

  const q = (input.query ?? "").trim();
  if (q.length < MIN_QUERY_LENGTH) {
    return `Error: "query" is required and must be at least ${MIN_QUERY_LENGTH} characters after trimming (LightRAG API). Example: "List entities related to X".`;
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
  if (input.chunk_top_k != null) {
    requestBody.chunk_top_k = input.chunk_top_k;
  }

  try {
    const response = await fetch(`${serverUrl}/query/data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `Error querying LightRAG data (HTTP ${response.status}): ${errorText}`;
    }

    const data = (await response.json()) as unknown;
    return JSON.stringify(data, null, 2);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return `Connection error: Could not reach LightRAG at ${serverUrl}.`;
    }
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
