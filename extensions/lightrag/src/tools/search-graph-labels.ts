import { getAuthToken, getServerUrl } from "../lib/auth";

type Input = {
  /** Fuzzy search string for label names. */
  q: string;
  /** Max results (1–100). Default 50. */
  limit?: number;
};

/**
 * Fuzzy search over graph entity labels.
 */
export default async function searchGraphLabels(input: Input): Promise<string> {
  const serverUrl = getServerUrl();
  const q = input.q?.trim() ?? "";
  if (!q) {
    return "Error: q (search query) is required.";
  }

  let token: string;
  try {
    token = await getAuthToken();
  } catch (error) {
    return `Authentication error: ${error instanceof Error ? error.message : String(error)}`;
  }

  const url = new URL(`${serverUrl}/graph/label/search`);
  url.searchParams.set("q", q);
  if (input.limit != null) {
    url.searchParams.set("limit", String(input.limit));
  }

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
      return `Error searching labels (HTTP ${response.status}): ${errorText}`;
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
