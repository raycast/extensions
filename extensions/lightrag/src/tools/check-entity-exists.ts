import { getAuthToken, getServerUrl } from "../lib/auth";

type Input = {
  /**
   * Exact entity label to check (JSON key must be `label`, same as "Knowledge Graph Subgraph").
   * Example: "Neural Rendering". The HTTP API uses query param `name=`; this tool maps `label` → `name`.
   */
  label: string;
  /**
   * Deprecated legacy alias for `label`. Prefer `label` for consistency with the subgraph tool. If both are set, `label` wins.
   */
  name?: string;
};

/**
 * Whether an entity with this label exists in the graph.
 */
export default async function checkEntityExists(input: Input): Promise<string> {
  const serverUrl = getServerUrl();
  const entity = (input.label ?? "").trim() || (input.name ?? "").trim();
  if (!entity) {
    return 'Error: "label" is required (exact entity string). Legacy alias "name" is accepted if "label" is empty.';
  }

  let token: string;
  try {
    token = await getAuthToken();
  } catch (error) {
    return `Authentication error: ${error instanceof Error ? error.message : String(error)}`;
  }

  const url = new URL(`${serverUrl}/graph/entity/exists`);
  url.searchParams.set("name", entity);

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
      return `Error checking entity (HTTP ${response.status}): ${errorText}`;
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
