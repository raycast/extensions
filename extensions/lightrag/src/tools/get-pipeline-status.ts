import { getAuthToken, getServerUrl } from "../lib/auth";

/**
 * Current document indexing pipeline: busy flag, job name, progress, recent messages.
 *
 * No tool arguments; Raycast passes `{}`.
 */
interface Input {}

export default async function getPipelineStatus(_input: Input): Promise<string> {
  void _input;
  const serverUrl = getServerUrl();

  let token: string;
  try {
    token = await getAuthToken();
  } catch (error) {
    return `Authentication error: ${error instanceof Error ? error.message : String(error)}`;
  }

  try {
    const response = await fetch(`${serverUrl}/documents/pipeline_status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `Error fetching pipeline status (HTTP ${response.status}): ${errorText}`;
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
