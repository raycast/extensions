import { getAuthToken, getServerUrl } from "../lib/auth";

type Input = {
  /** Entity name to check in the knowledge graph. */
  name: string;
};

/**
 * Whether an entity with this name exists in the graph.
 */
export default async function checkEntityExists(input: Input): Promise<string> {
  const serverUrl = getServerUrl();
  const name = input.name?.trim() ?? "";
  if (!name) {
    return "Error: name is required.";
  }

  let token: string;
  try {
    token = await getAuthToken();
  } catch (error) {
    return `Authentication error: ${error instanceof Error ? error.message : String(error)}`;
  }

  const url = new URL(`${serverUrl}/graph/entity/exists`);
  url.searchParams.set("name", name);

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
