import { getAuthToken, getServerUrl } from "../lib/auth";

type Input = {
  /**
   * Batch tracking id (JSON key `track_id`). From insert-text or upload responses.
   * Example: "upload_20250729_abc123"
   */
  track_id: string;
};

/**
 * Processing status for documents tied to a track_id (upload/text insert batches).
 */
export default async function getTrackStatus(input: Input): Promise<string> {
  const serverUrl = getServerUrl();
  const id = input.track_id?.trim() ?? "";
  if (!id) {
    return 'Error: "track_id" is required (non-empty string from insert-text or upload).';
  }

  let token: string;
  try {
    token = await getAuthToken();
  } catch (error) {
    return `Authentication error: ${error instanceof Error ? error.message : String(error)}`;
  }

  const path = `${serverUrl}/documents/track_status/${encodeURIComponent(id)}`;

  try {
    const response = await fetch(path, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `Error fetching track status (HTTP ${response.status}): ${errorText}`;
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
