import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

// Single instance
export let thinking = false;
let firstThinking = true;

const invisible = "\u200B";

/**
 * Clean up each streamed line from the server.
 */
function cleanStreamLine(line: string, showThinking: boolean): string {
  const prefix = line[0];
  const payloadRaw = line.slice(2).trim();

  let payload: string;
  try {
    payload = JSON.parse(payloadRaw);
  } catch (err) {
    payload = payloadRaw.replace(/^"|"$/g, "");
  }

  let text = "";
  switch (prefix) {
    case "0":
      if (payload === "<think>" || payload === "<think>\n") {
        thinking = true;

        if (showThinking) {
          text += "**Thinking:**\n\n _";
          firstThinking = true;
          break;
        }

        text += "**Thinking..**";
      }

      if (payload === "</think>" || payload === "</think>\n") {
        thinking = false;

        if (showThinking) {
          text += `${invisible}._\n\n\n**Response:** \n\n`;
          break;
        }

        text += "\n\n**Response:** \n\n";
        break;
      }

      if (thinking && !showThinking) {
        break;
      }

      if (thinking && firstThinking) {
        firstThinking = false;
        text += payload.trim();
        break;
      }

      text += payload;
      break;
    case "g":
      text += payload;
      break;
    default:
      break;
  }
  return text;
}

export interface ConversationItem {
  question: string;
  response: string;
}

export async function streamChat(
  query: string,
  history: ConversationItem[],
  model: string,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const { accessToken, reasoningEffort, name, occupation, traits, additionalInfo, showThinking } =
    getPreferenceValues<Preferences>();

  if (!accessToken) {
    throw new Error("No access token found. Please set an access token in the Advanced Options.");
  }

  const modelParams = model === "gpt-o3-mini" ? { reasoningEffort: reasoningEffort } : undefined;

  const preferences = {
    name,
    occupation,
    selectedTraits: traits,
    additionalInfo,
  };

  const messages = [
    ...history.flatMap((item) => [
      { role: "user", content: item.question, attachments: [] },
      { role: "assistant", content: item.response, attachments: [] },
    ]),
    { role: "user", content: query, attachments: [] },
  ];

  const response = await fetch("https://t3.chat/api/chat", {
    method: "POST",
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": 'Chromium";v="133", "Not(A:Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "macOS",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      Cookie: `access_token=${accessToken}; Path=/; HttpOnly;`,
    },
    body: JSON.stringify({
      messages,
      model,
      modelParams,
      threadMetadata: { id: "someThreadId", title: "New Thread" },
      token: "pro-token-override",
      preferences,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch streaming response: " + response.statusText);
  }

  const decoder = new TextDecoder("utf-8");
  if (!response.body) return;

  // stream the response (async iterable).
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    const chunkText = decoder.decode(chunk, { stream: true });
    const lines = chunkText.split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      const cleaned = cleanStreamLine(line.trim(), showThinking);
      if (cleaned) {
        onChunk(cleaned);
      }
    }
  }
}
