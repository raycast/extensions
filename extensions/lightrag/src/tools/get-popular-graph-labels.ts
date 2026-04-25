import { getAuthToken, getServerUrl } from "../lib/auth";

type Input = {
  /** Max hub labels to return (1–1000). Example: 300 (server default if omitted). */
  limit?: number;
};

/**
 * Most connected graph labels by node degree (central entities).
 */
export default async function getPopularGraphLabels(input: Input): Promise<string> {
  const serverUrl = getServerUrl();

  let token: string;
  try {
    token = await getAuthToken();
  } catch (error) {
    return `Authentication error: ${error instanceof Error ? error.message : String(error)}`;
  }

  const url = new URL(`${serverUrl}/graph/label/popular`);
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
      return `Error fetching popular labels (HTTP ${response.status}): ${errorText}`;
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
