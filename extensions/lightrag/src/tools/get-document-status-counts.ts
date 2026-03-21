import { getAuthToken, getServerUrl } from "../lib/auth";

type Input = {
  /** Unused; Raycast may pass an empty object. */
  unused?: string;
};

/**
 * Lightweight counts of documents per processing status (no row listing).
 */
export default async function getDocumentStatusCounts(input: Input): Promise<string> {
  void input;
  const serverUrl = getServerUrl();

  let token: string;
  try {
    token = await getAuthToken();
  } catch (error) {
    return `Authentication error: ${error instanceof Error ? error.message : String(error)}`;
  }

  try {
    const response = await fetch(`${serverUrl}/documents/status_counts`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `Error fetching status counts (HTTP ${response.status}): ${errorText}`;
    }

    const data = (await response.json()) as Record<string, unknown>;
    return JSON.stringify(data, null, 2);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return `Connection error: Could not reach LightRAG at ${serverUrl}.`;
    }
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
