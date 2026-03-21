import { getAuthToken, getServerUrl } from "../lib/auth";

/** Fixed provenance for text inserted from Raycast AI (see package.json tool description). */
export const INSERT_TEXT_FILE_SOURCE = "raycast_chat_text";

type Input = {
  /** Non-empty text to index (e.g. summary or notes). */
  text: string;
};

export default async function insertText(input: Input): Promise<string> {
  const serverUrl = getServerUrl();

  let token: string;
  try {
    token = await getAuthToken();
  } catch (error) {
    return `Authentication error: ${error instanceof Error ? error.message : String(error)}`;
  }

  const trimmed = input.text?.trim() ?? "";
  if (!trimmed) {
    return "Error: text must be non-empty.";
  }

  try {
    const response = await fetch(`${serverUrl}/documents/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text: trimmed,
        file_source: INSERT_TEXT_FILE_SOURCE,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `Error inserting text (HTTP ${response.status}): ${errorText}`;
    }

    const data = (await response.json()) as {
      status?: string;
      message?: string;
      track_id?: string;
    };

    let result = "";
    if (data.message) {
      result += `${data.message}\n`;
    }
    if (data.status) {
      result += `Status: ${data.status}\n`;
    }
    if (data.track_id) {
      result += `\n**track_id:** \`${data.track_id}\`\n`;
      result += "\nUse **get-track-status** with this track_id if the user asks whether processing finished.";
    }
    return result.trim() || JSON.stringify(data, null, 2);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return `Connection error: Could not reach LightRAG at ${serverUrl}.`;
    }
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
